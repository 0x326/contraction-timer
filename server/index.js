const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

let leaderSocketId = null;
let lastSeq = 0;

io.on('connection', (socket) => {
  socket.on('verify-leader', () => {
    socket.emit('leader', socket.id === leaderSocketId);
  });

  socket.on('request-leader', () => {
    if (leaderSocketId && leaderSocketId !== socket.id) {
      io.to(leaderSocketId).emit('leader', false);
    }
    leaderSocketId = socket.id;
    lastSeq = 0;
    socket.emit('leader', true);
  });

  socket.on('timer-state', (payload) => {
    if (socket.id !== leaderSocketId) return;
    if (payload.seq <= lastSeq) return;
    lastSeq = payload.seq;
    socket.broadcast.emit('timer-state', payload.state);
  });

  socket.on('disconnect', () => {
    if (socket.id === leaderSocketId) {
      leaderSocketId = null;
    }
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Socket server listening on ${PORT}`);
});
