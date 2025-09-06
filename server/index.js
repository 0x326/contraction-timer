const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

/** simple structured logger (JSONL) */
const LOG_LEVELS = { error: 0, warn: 1, info: 2, debug: 3 };
const CURRENT_LEVEL = process.env.LOG_LEVEL || 'info';
const SHOULD_LOG = (lvl) => LOG_LEVELS[lvl] <= LOG_LEVELS[CURRENT_LEVEL];

function log(level, evt, fields = {}) {
  if (!SHOULD_LOG(level)) return;
  const rec = {
    ts: new Date().toISOString(),
    level,
    evt,
    ...fields,
  };
  // eslint-disable-next-line no-console
  console.log(JSON.stringify(rec));
}

const lobbies = new Map();

io.on('connection', (socket) => {
  const { lobby = 'default' } = socket.handshake.query || {};
  const shortId = socket.id.slice(0, 6);

  if (!lobbies.has(lobby)) {
    lobbies.set(lobby, { leaderSocketId: null, lastSeq: 0 });
    log('info', 'lobby.created', { lobby });
  }

  socket.join(lobby);
  const lobbyState = lobbies.get(lobby);

  log('info', 'socket.connected', {
    lobby,
    socketId: socket.id,
    shortId,
    socketsInLobby: io.sockets.adapter.rooms.get(lobby)?.size || 0,
  });

  socket.on('verify-leader', () => {
    const isLeader = socket.id === lobbyState.leaderSocketId;
    log('debug', 'leader.verify', { lobby, shortId, isLeader });
    socket.emit('leader', isLeader);
  });

  socket.on('request-leader', () => {
    const prevLeader = lobbyState.leaderSocketId;
    if (prevLeader && prevLeader !== socket.id) {
      io.to(prevLeader).emit('leader', false);
      log('info', 'leader.revoked', { lobby, prevLeader: prevLeader.slice(0, 6) });
    }
    lobbyState.leaderSocketId = socket.id;
    lobbyState.lastSeq = 0;
    socket.emit('leader', true);
    log('info', 'leader.granted', { lobby, newLeader: shortId });
  });

  socket.on('timer-state', (payload = {}) => {
    if (socket.id !== lobbyState.leaderSocketId) {
      log('warn', 'timer.ignored.notLeader', { lobby, shortId });
      return;
    }
    const seq = Number(payload.seq ?? -1);
    if (Number.isNaN(seq)) {
      log('warn', 'timer.badSeq', { lobby, shortId, got: payload.seq });
      return;
    }
    if (seq <= lobbyState.lastSeq) {
      log('debug', 'timer.stale', { lobby, shortId, seq, lastSeq: lobbyState.lastSeq });
      return;
    }
    lobbyState.lastSeq = seq;
    socket.to(lobby).emit('timer-state', payload.state);
    log('info', 'timer.broadcast', { lobby, shortId, seq });
  });

  socket.on('disconnect', (reason) => {
    const wasLeader = socket.id === lobbyState.leaderSocketId;
    if (wasLeader) {
      lobbyState.leaderSocketId = null;
      log('info', 'leader.cleared', { lobby, shortId, reason });
    }
    const remaining = io.sockets.adapter.rooms.get(lobby)?.size || 0;
    log('info', 'socket.disconnected', { lobby, shortId, reason, socketsInLobby: remaining });

    // optional: clean up empty lobbies
    if (remaining === 0) {
      lobbies.delete(lobby);
      log('info', 'lobby.deleted', { lobby });
    }
  });

  // catch-all error logging (per-socket)
  socket.on('error', (err) => {
    log('error', 'socket.error', { lobby, shortId, message: err?.message });
  });
});

// optional: basic healthcheck
app.get('/health', (_req, res) => res.status(200).send('ok'));

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  log('info', 'server.started', { port: PORT, logLevel: process.env.LOG_LEVEL || 'info' });
});
