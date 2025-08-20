const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

const sessions = {};

io.on('connection', (socket) => {
  socket.on('join', ({ sessionId, persona }) => {
    socket.join(sessionId);
    if (!sessions[sessionId]) {
      sessions[sessionId] = { running: false, contractions: [] };
    }
    if (persona === 'monitor') {
      socket.emit('sync', sessions[sessionId]);
    }
  });

  socket.on('sync', ({ sessionId, state }) => {
    sessions[sessionId] = state;
    socket.to(sessionId).emit('sync', state);
  });
});

const port = process.env.PORT || 4000;
server.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`Server listening on ${port}`);
});
