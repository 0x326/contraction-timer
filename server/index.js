const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { readState, writeState } = require('./persist');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

const lobbies = new Map();

// Load persisted lobby state
const persisted = readState();
Object.entries(persisted).forEach(([lobby, data]) => {
  lobbies.set(lobby, {
    leaderSocketId: null,
    leaderClientId: data.leaderClientId || null,
    lastSeq: data.lastSeq || 0,
    state: data.state || null,
  });
});

const persist = () => {
  const obj = {};
  lobbies.forEach((value, key) => {
    obj[key] = {
      leaderClientId: value.leaderClientId,
      lastSeq: value.lastSeq,
      state: value.state,
    };
  });
  writeState(obj);
};

io.on('connection', (socket) => {
  const { lobby = 'default', clientId = null } = socket.handshake.query;
  if (!lobbies.has(lobby)) {
    lobbies.set(lobby, {
      leaderSocketId: null,
      leaderClientId: null,
      lastSeq: 0,
      state: null,
    });
    persist();
  }
  socket.join(lobby);
  const lobbyState = lobbies.get(lobby);

  // Reconnecting leader retains leadership
  if (clientId && clientId === lobbyState.leaderClientId) {
    lobbyState.leaderSocketId = socket.id;
    socket.emit('leader', { isLeader: true, seq: lobbyState.lastSeq });
  }

  if (lobbyState.state) {
    socket.emit('timer-state', lobbyState.state);
  }

  socket.on('verify-leader', () => {
    const isLeader = clientId && clientId === lobbyState.leaderClientId;
    if (isLeader) {
      lobbyState.leaderSocketId = socket.id;
    }
    socket.emit('leader', { isLeader, seq: lobbyState.lastSeq });
  });

  socket.on('request-leader', () => {
    if (lobbyState.leaderSocketId && lobbyState.leaderSocketId !== socket.id) {
      io.to(lobbyState.leaderSocketId).emit('leader', { isLeader: false });
    }
    lobbyState.leaderSocketId = socket.id;
    lobbyState.leaderClientId = clientId;
    socket.emit('leader', { isLeader: true, seq: lobbyState.lastSeq });
    persist();
  });

  socket.on('timer-state', (payload) => {
    if (socket.id !== lobbyState.leaderSocketId) return;
    if (payload.seq <= lobbyState.lastSeq) return;
    lobbyState.lastSeq = payload.seq;
    lobbyState.state = payload.state;
    socket.to(lobby).emit('timer-state', payload.state);
    persist();
  });

  socket.on('disconnect', () => {
    if (socket.id === lobbyState.leaderSocketId) {
      lobbyState.leaderSocketId = null;
    }
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Socket server listening on ${PORT}`);
});

