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
    clientSockets: new Map(),
    pending: null,
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
      clientSockets: new Map(),
      pending: null,
    });
    persist();
  }
  socket.join(lobby);
  const lobbyState = lobbies.get(lobby);

  if (clientId) {
    let sockets = lobbyState.clientSockets.get(clientId);
    if (!sockets) {
      sockets = new Set();
      lobbyState.clientSockets.set(clientId, sockets);
    }
    sockets.add(socket.id);
  }

  if (lobbyState.state) {
    socket.emit('timer-state', lobbyState.state);
  }
  socket.on('check-leadership', () => {
    const isLeader = clientId && clientId === lobbyState.leaderClientId;
    if (isLeader) {
      const sockets = lobbyState.clientSockets.get(clientId) || new Set();
      sockets.forEach((id) => {
        if (id !== socket.id) {
          io.to(id).emit('leadership-info', { isLeader: false });
        }
      });
      lobbyState.leaderSocketId = socket.id;
    }
    socket.emit('leadership-info', { isLeader, seq: lobbyState.lastSeq });
  });

  socket.on('request-leadership', ({ seq }) => {
    if (clientId === lobbyState.leaderClientId) {
      lobbyState.leaderSocketId = socket.id;
      lobbyState.lastSeq = seq;
      socket.emit('leadership-info', { isLeader: true, seq: lobbyState.lastSeq });
      return;
    }

    if (lobbyState.leaderClientId) {
      const oldSockets = lobbyState.clientSockets.get(lobbyState.leaderClientId) || new Set([lobbyState.leaderSocketId]);
      lobbyState.pending = {
        newSocketId: socket.id,
        newClientId: clientId,
        newSeq: seq,
        oldSocketId: lobbyState.leaderSocketId,
        timeout: setTimeout(() => {
          finalizeTransfer(null);
        }, 500),
      };
      oldSockets.forEach((id) => {
        io.to(id).emit('leadership-info', { isLeader: false });
      });
      if (lobbyState.leaderSocketId) {
        io.to(lobbyState.leaderSocketId).emit('transfer-leadership');
      }
    } else {
      lobbyState.leaderSocketId = socket.id;
      lobbyState.leaderClientId = clientId;
      lobbyState.lastSeq = seq;
      const payload = { isLeader: true, seq: lobbyState.lastSeq };
      if (lobbyState.state) payload.state = lobbyState.state;
      socket.emit('leadership-info', payload);
      persist();
    }
  });

  const finalizeTransfer = (statePayload) => {
    if (!lobbyState.pending) return;
    const { newSocketId, newClientId, newSeq, oldSocketId, timeout } = lobbyState.pending;
    clearTimeout(timeout);
    if (statePayload) {
      lobbyState.state = statePayload.state;
    }
    lobbyState.leaderSocketId = newSocketId;
    lobbyState.leaderClientId = newClientId;
    lobbyState.lastSeq = newSeq;
    const payload = { isLeader: true, seq: lobbyState.lastSeq };
    if (lobbyState.state) payload.state = lobbyState.state;
    io.to(newSocketId).emit('leadership-info', payload);
    if (lobbyState.state) {
      io.to(lobby).except(newSocketId).except(oldSocketId).emit('timer-state', lobbyState.state);
    }
    lobbyState.pending = null;
    persist();
  };

  socket.on('final-timer-state', (payload) => {
    if (socket.id !== lobbyState.leaderSocketId) return;
    finalizeTransfer(payload);
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
    if (clientId) {
      const sockets = lobbyState.clientSockets.get(clientId);
      if (sockets) {
        sockets.delete(socket.id);
        if (sockets.size === 0) {
          lobbyState.clientSockets.delete(clientId);
        }
      }
    }
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Socket server listening on ${PORT}`);
});

