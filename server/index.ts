import express, { Request } from 'express';
import http from 'http';
import cors from 'cors';
import { Server } from 'socket.io';
import { readState, writeState, PersistedState } from './persist';
import type { TimerState } from '../src/store/timer/timer.slice';
import logger from './logger';

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
  timeout: NodeJS.Timeout | null;
}

const app = express();
app.use(cors());
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' },
});

const lobbies = new Map<string, LobbyState>();
const LEADERSHIP_TRANSFER_TIMEOUT_MS = 5000;

const persist = () => {
  const obj: PersistedState = {};
  lobbies.forEach((value, key) => {
    obj[key] = {
      leaderClientId: value.leaderClientId,
      lastSeq: value.lastSeq,
      state: value.state,
    };
  });
  void writeState(obj).catch((err) => {
    logger.error({ err }, 'failed to persist state');
  });
};

const start = async () => {
  let persisted: PersistedState = {};
  try {
    persisted = await Promise.race([
      readState(),
      new Promise<PersistedState>((resolve) => setTimeout(() => resolve({}), 5000)),
    ]);
  } catch (err) {
    logger.error({ err }, 'failed to load persisted state');
    persisted = {};
  }
  logger.info({ lobbies: Object.keys(persisted).length }, 'loaded persisted state');
  Object.entries(persisted).forEach(([lobby, data]) => {
    lobbies.set(lobby, {
      leaderSocketId: null,
      leaderClientId: data.leaderClientId || null,
      lastSeq: data.lastSeq || 0,
      state: data.state || null,
      clientSockets: new Map(),
      pending: null,
      sockets: new Set(),
      timeout: null,
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
    logger.info({ event: 'connection', lobby, clientId, socketId: socket.id }, 'socket connected');
    if (!lobbies.has(lobby)) {
      lobbies.set(lobby, {
        leaderSocketId: null,
        leaderClientId: null,
        lastSeq: 0,
        state: null,
        clientSockets: new Map(),
        pending: null,
        sockets: new Set(),
        timeout: null,
      });
      persist();
    }
    socket.join(lobby);
    const lobbyState = lobbies.get(lobby)!;

    if (lobbyState.timeout) {
      clearTimeout(lobbyState.timeout);
      lobbyState.timeout = null;
    }

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

    socket.on('sync-time', (cb: (serverTime: number) => void) => {
      const isLeader = !!clientId && clientId === lobbyState.leaderClientId;
      logger.debug({ event: 'sync-time', lobby, clientId, socketId: socket.id, isLeader });
      cb(Date.now());
    });

    socket.on('check-leadership', () => {
      const isLeader = !!clientId && clientId === lobbyState.leaderClientId;
      logger.debug({ event: 'check-leadership', lobby, clientId, socketId: socket.id, isLeader }, 'leadership checked');
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
      logger.info({ event: 'request-leadership', lobby, clientId, seq, socketId: socket.id }, 'leadership requested');
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
          }, LEADERSHIP_TRANSFER_TIMEOUT_MS),
        };
        oldSockets.forEach((id) => {
          io.to(id).emit('leadership-info', { isLeader: false });
        });
        if (lobbyState.leaderSocketId) {
          io.to(lobbyState.leaderSocketId).emit('transfer-leadership');
          logger.info({ event: 'transfer-leadership', lobby, from: lobbyState.leaderClientId, to: clientId }, 'initiated leadership transfer');
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
        logger.info({ event: 'leadership-granted', lobby, clientId, seq: lobbyState.lastSeq }, 'leadership granted');
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
      logger.info({ event: 'leadership-granted', lobby, clientId: newClientId, seq: lobbyState.lastSeq }, 'leadership granted');
      if (lobbyState.state) {
        io.to(lobby).except(newSocketId).except(oldSocketId ?? '').emit('timer-state', lobbyState.state);
      }
      lobbyState.pending = null;
      persist();
    };

    socket.on('final-timer-state', (payload: { seq: number; state: TimerState }) => {
      if (socket.id !== lobbyState.leaderSocketId) return;
      logger.info({ event: 'final-timer-state', lobby, clientId, seq: payload.seq }, 'received final state');
      finalizeTransfer(payload);
    });

    socket.on('timer-state', (payload: { seq: number; state: TimerState }) => {
      if (socket.id !== lobbyState.leaderSocketId) return;
      if (payload.seq <= lobbyState.lastSeq) return;
      lobbyState.lastSeq = payload.seq;
      lobbyState.state = payload.state;
      logger.debug({ event: 'timer-state', lobby, clientId, seq: payload.seq }, 'timer state received');
      socket.to(lobby).emit('timer-state', payload.state);
      persist();
    });

    socket.on('disconnect', () => {
      logger.info({ event: 'disconnect', lobby, clientId, socketId: socket.id }, 'socket disconnected');
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
        lobbyState.timeout = setTimeout(() => {
          lobbies.delete(lobby);
          persist();
        }, 24 * 60 * 60 * 1000);
        persist();
      }
    });
  });

  const PORT = process.env.PORT || 3001;
  server.listen(PORT, () => {
    logger.info({ port: PORT }, 'Socket server listening');
  });
};

start();
