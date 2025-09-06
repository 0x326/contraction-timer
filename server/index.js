const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

const lobbies = new Map();

io.on('connection', (socket) => {
  const { lobby = 'default' } = socket.handshake.query;
  if (!lobbies.has(lobby)) {
    lobbies.set(lobby, { leaderSocketId: null, lastSeq: 0 });
  }
  socket.join(lobby);
  const lobbyState = lobbies.get(lobby);

  socket.on('verify-leader', () => {
    socket.emit('leader', socket.id === lobbyState.leaderSocketId);
  });

  socket.on('request-leader', () => {
    if (lobbyState.leaderSocketId && lobbyState.leaderSocketId !== socket.id) {
      io.to(lobbyState.leaderSocketId).emit('leader', false);
    }
    lobbyState.leaderSocketId = socket.id;
    lobbyState.lastSeq = 0;
    socket.emit('leader', true);
  });

  socket.on('timer-state', (payload) => {
    if (socket.id !== lobbyState.leaderSocketId) return;
    if (payload.seq <= lobbyState.lastSeq) return;
    lobbyState.lastSeq = payload.seq;
    socket.to(lobby).emit('timer-state', payload.state);
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
