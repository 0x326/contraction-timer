import express, { Request } from 'express';
import http from 'http';
import cors from 'cors';
import { Server } from 'socket.io';
import { readState, writeState, PersistedState } from './persist';
import type { TimerState } from '../src/store/timer/timer.slice';

interface PendingTransfer {
  newSocketId: string;
  newClientId: string;
  newSeq: number;
  oldSocketId: string | null;
  timeout: NodeJS.Timeout;
}

interface LobbyState {
  leaderSocketId: string | null;
  leaderClientId: string | null;
  lastSeq: number;
  state: TimerState | null;
  clientSockets: Map<string, Set<string>>;
  pending: PendingTransfer | null;
  sockets: Set<string>;
}

const app = express();
app.use(cors());
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

const lobbies = new Map<string, LobbyState>();

const persist = () => {
  const obj: PersistedState = {};
  lobbies.forEach((value, key) => {
    obj[key] = {
      leaderClientId: value.leaderClientId,
      lastSeq: value.lastSeq,
      state: value.state,
    };
  });
  writeState(obj);
};

const start = async () => {
  let persisted: PersistedState = {};
  try {
    persisted = await Promise.race([
      readState(),
      new Promise<PersistedState>((resolve) => setTimeout(() => resolve({}), 5000)),
    ]);
  } catch {
    persisted = {};
  }
  Object.entries(persisted).forEach(([lobby, data]) => {
    lobbies.set(lobby, {
      leaderSocketId: null,
      leaderClientId: data.leaderClientId || null,
      lastSeq: data.lastSeq || 0,
      state: data.state || null,
      clientSockets: new Map(),
      pending: null,
      sockets: new Set(),
    });
  });

  app.get('/lobbies', (_req: Request, res: any) => {
    res.json(Array.from(lobbies.keys()));
  });

  io.on('connection', (socket) => {
    const { lobby = 'default', clientId = null } = socket.handshake.query as {
      lobby?: string;
      clientId?: string;
    };
    if (!lobbies.has(lobby)) {
      lobbies.set(lobby, {
        leaderSocketId: null,
        leaderClientId: null,
        lastSeq: 0,
        state: null,
        clientSockets: new Map(),
        pending: null,
        sockets: new Set(),
      });
      persist();
    }
    socket.join(lobby);
    const lobbyState = lobbies.get(lobby)!;

    lobbyState.sockets.add(socket.id);

    if (clientId) {
      let sockets = lobbyState.clientSockets.get(clientId);
      if (!sockets) {
        sockets = new Set<string>();
        lobbyState.clientSockets.set(clientId, sockets);
      }
      sockets.add(socket.id);
    }

    if (lobbyState.state) {
      socket.emit('timer-state', lobbyState.state);
    }

    socket.on('check-leadership', () => {
      const isLeader = !!clientId && clientId === lobbyState.leaderClientId;
      if (isLeader) {
        const sockets = lobbyState.clientSockets.get(clientId!) || new Set<string>();
        sockets.forEach((id) => {
          if (id !== socket.id) {
            io.to(id).emit('leadership-info', { isLeader: false });
          }
        });
        lobbyState.leaderSocketId = socket.id;
      }
      socket.emit('leadership-info', { isLeader, seq: lobbyState.lastSeq });
    });

    socket.on('request-leadership', ({ seq }: { seq: number }) => {
      if (clientId === lobbyState.leaderClientId) {
        lobbyState.leaderSocketId = socket.id;
        lobbyState.lastSeq = seq;
        socket.emit('leadership-info', { isLeader: true, seq: lobbyState.lastSeq });
        return;
      }

      if (lobbyState.leaderClientId) {
        const oldSockets =
          lobbyState.clientSockets.get(lobbyState.leaderClientId) || new Set([lobbyState.leaderSocketId!]);
        lobbyState.pending = {
          newSocketId: socket.id,
          newClientId: clientId!,
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
        lobbyState.leaderClientId = clientId!;
        lobbyState.lastSeq = seq;
        const payload: { isLeader: true; seq: number; state?: TimerState } = {
          isLeader: true,
          seq: lobbyState.lastSeq,
        };
        if (lobbyState.state) payload.state = lobbyState.state;
        socket.emit('leadership-info', payload);
        persist();
      }
    });

    const finalizeTransfer = (statePayload: { state: TimerState } | null) => {
      if (!lobbyState.pending) return;
      const { newSocketId, newClientId, newSeq, oldSocketId, timeout } = lobbyState.pending;
      clearTimeout(timeout);
      if (statePayload) {
        lobbyState.state = statePayload.state;
      }
      lobbyState.leaderSocketId = newSocketId;
      lobbyState.leaderClientId = newClientId;
      lobbyState.lastSeq = newSeq;
      const payload: { isLeader: true; seq: number; state?: TimerState } = {
        isLeader: true,
        seq: lobbyState.lastSeq,
      };
      if (lobbyState.state) payload.state = lobbyState.state;
      io.to(newSocketId).emit('leadership-info', payload);
      if (lobbyState.state) {
        io.to(lobby).except(newSocketId).except(oldSocketId ?? '').emit('timer-state', lobbyState.state);
      }
      lobbyState.pending = null;
      persist();
    };

    socket.on('final-timer-state', (payload: { seq: number; state: TimerState }) => {
      if (socket.id !== lobbyState.leaderSocketId) return;
      finalizeTransfer(payload);
    });

    socket.on('timer-state', (payload: { seq: number; state: TimerState }) => {
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
      lobbyState.sockets.delete(socket.id);
      if (lobbyState.sockets.size === 0) {
        lobbies.delete(lobby);
        persist();
      }
    });
  });

  const PORT = process.env.PORT || 3001;
  server.listen(PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`Socket server listening on ${PORT}`);
  });
};

start();
