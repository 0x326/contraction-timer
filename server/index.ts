import express, { Request, Response } from 'express';
import http from 'http';
import cors from 'cors';
import { Server, Socket } from 'socket.io';
import { readState, writeState, PersistedState } from './persist';
import type { TimerState } from '../src/store/timer/timer.slice';
import type {
  SyncTimeResponsePayload,
  RequestLeadershipPayload,
  LeadershipInfoPayload,
  TimerStatePayload,
  TimerStateUpdatePayload,
} from '../src/socket-events';
import logger from './logger';

interface PendingLeadershipTransfer {
  newSocketId: string;
  newClientId: string;
  newSequenceNumber: number;
  oldSocketId: string | null;
  timeout: NodeJS.Timeout;
}

interface LobbyState {
  leaderSocketId: string | null;
  leaderClientId: string | null;
  lastSequenceNumber: number;
  state: TimerState | null;
  clientSockets: Map<string, Set<string>>;
  pendingTransfer: PendingLeadershipTransfer | null;
  sockets: Set<string>;
  timeout: NodeJS.Timeout | null;
}

const app = express();
app.use(cors());
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' },
});

const lobbyStateMap = new Map<string, LobbyState>();

// Persist the current lobby state to disk or redis
function persistLobbyState(): void {
  const stateToPersist: PersistedState = {};
  lobbyStateMap.forEach(function collectLobbyState(value, key) {
    stateToPersist[key] = {
      leaderClientId: value.leaderClientId,
      lastSequenceNumber: value.lastSequenceNumber,
      state: value.state,
    };
  });
  void writeState(stateToPersist).catch(function logPersistError(err) {
    logger.error({ err }, 'failed to persist state');
  });
}

async function startServer() {
  let loadedState: PersistedState = {};
  try {
    loadedState = await Promise.race([
      readState(),
      new Promise<PersistedState>(function resolver(resolve) {
        function resolveEmptyState(): void {
          resolve({});
        }
        setTimeout(resolveEmptyState, 5000);
      }),
    ]);
  } catch (err) {
    logger.error({ err }, 'failed to load persisted state');
    loadedState = {};
  }
  logger.info({ lobbies: Object.keys(loadedState).length }, 'loaded persisted state');
  for (const [lobby, data] of Object.entries(loadedState)) {
    lobbyStateMap.set(lobby, {
      leaderSocketId: null,
      leaderClientId: data.leaderClientId || null,
      lastSequenceNumber: data.lastSequenceNumber || 0,
      state: data.state || null,
      clientSockets: new Map(),
      pendingTransfer: null,
      sockets: new Set(),
      timeout: null,
    });
  }

  function handleLobbiesRequest(_req: Request, res: Response): void {
    res.json(Array.from(lobbyStateMap.keys()));
  }

  app.get('/lobbies', handleLobbiesRequest);

  // Handle a new incoming socket connection
  function handleSocketConnection(socket: Socket): void {
    const { lobby = 'default', clientId = null } = socket.handshake.query as {
      lobby?: string;
      clientId?: string;
    };
    logger.info({ event: 'connection', lobby, clientId, socketId: socket.id }, 'socket connected');
    if (!lobbyStateMap.has(lobby)) {
      lobbyStateMap.set(lobby, {
        leaderSocketId: null,
        leaderClientId: null,
        lastSequenceNumber: 0,
        state: null,
        clientSockets: new Map(),
        pendingTransfer: null,
        sockets: new Set(),
        timeout: null,
      });
      persistLobbyState();
    }
    socket.join(lobby);
    const lobbyState = lobbyStateMap.get(lobby)!;

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
      const timerPayload: TimerStatePayload = { state: lobbyState.state };
      socket.emit('timer-state', timerPayload);
    }

    // Respond with the server's current time for clock synchronization
    function handleSyncTime(
      respond: (payload: SyncTimeResponsePayload) => void,
    ): void {
      const isLeader = !!clientId && clientId === lobbyState.leaderClientId;
      logger.debug({ event: 'sync-time', lobby, clientId, socketId: socket.id, isLeader });
      respond({ serverTime: Date.now() });
    }

    // Let the client know who currently holds leadership
    function handleCheckLeadership(): void {
      const isLeader = !!clientId && clientId === lobbyState.leaderClientId;
      logger.debug({ event: 'check-leadership', lobby, clientId, socketId: socket.id, isLeader }, 'leadership checked');
      if (isLeader) {
        const clientSocketIds = lobbyState.clientSockets.get(clientId!) || new Set<string>();
        clientSocketIds.forEach(function notifyOtherSockets(id) {
          if (id !== socket.id) {
            const info: LeadershipInfoPayload = { isLeader: false };
            io.to(id).emit('leadership-info', info);
          }
        });
        lobbyState.leaderSocketId = socket.id;
      }
      const info: LeadershipInfoPayload = {
        isLeader,
        sequenceNumber: lobbyState.lastSequenceNumber,
      };
      socket.emit('leadership-info', info);
    }

    // Initiate a leadership change request from this socket
    function handleRequestLeadership({ sequenceNumber }: RequestLeadershipPayload): void {
      logger.info({ event: 'request-leadership', lobby, clientId, sequenceNumber, socketId: socket.id }, 'leadership requested');
      if (clientId === lobbyState.leaderClientId) {
        lobbyState.leaderSocketId = socket.id;
        lobbyState.lastSequenceNumber = sequenceNumber;
        const info: LeadershipInfoPayload = {
          isLeader: true,
          sequenceNumber: lobbyState.lastSequenceNumber,
        };
        socket.emit('leadership-info', info);
        return;
      }

      if (lobbyState.leaderClientId) {
        const currentLeaderSockets =
          lobbyState.clientSockets.get(lobbyState.leaderClientId) || new Set([lobbyState.leaderSocketId!]);
        lobbyState.pendingTransfer = {
          newSocketId: socket.id,
          newClientId: clientId!,
          newSequenceNumber: sequenceNumber,
          oldSocketId: lobbyState.leaderSocketId,
          timeout: setTimeout(handleTransferTimeout, 500),
        };
        currentLeaderSockets.forEach(function notifyCurrentLeader(id) {
          const info: LeadershipInfoPayload = { isLeader: false };
          io.to(id).emit('leadership-info', info);
        });
        if (lobbyState.leaderSocketId) {
          io.to(lobbyState.leaderSocketId).emit('transfer-leadership');
          logger.info({ event: 'transfer-leadership', lobby, from: lobbyState.leaderClientId, to: clientId }, 'initiated leadership transfer');
        }
      } else {
        lobbyState.leaderSocketId = socket.id;
        lobbyState.leaderClientId = clientId!;
        lobbyState.lastSequenceNumber = sequenceNumber;
        const info: LeadershipInfoPayload = {
          isLeader: true,
          sequenceNumber: lobbyState.lastSequenceNumber,
        };
        if (lobbyState.state) info.state = lobbyState.state;
        socket.emit('leadership-info', info);
        logger.info({ event: 'leadership-granted', lobby, clientId, sequenceNumber: lobbyState.lastSequenceNumber }, 'leadership granted');
        persistLobbyState();
      }
    }

    // Complete a pending leadership transfer once final state is known
    function finalizeLeadershipTransfer(statePayload: TimerStatePayload | null): void {
      if (!lobbyState.pendingTransfer) return;
      const { newSocketId, newClientId, newSequenceNumber, oldSocketId, timeout } = lobbyState.pendingTransfer;
      clearTimeout(timeout);
      if (statePayload) {
        lobbyState.state = statePayload.state;
      }
      lobbyState.leaderSocketId = newSocketId;
      lobbyState.leaderClientId = newClientId;
      lobbyState.lastSequenceNumber = newSequenceNumber;
      const info: LeadershipInfoPayload = {
        isLeader: true,
        sequenceNumber: lobbyState.lastSequenceNumber,
      };
      if (lobbyState.state) info.state = lobbyState.state;
      io.to(newSocketId).emit('leadership-info', info);
      logger.info({ event: 'leadership-granted', lobby, clientId: newClientId, sequenceNumber: lobbyState.lastSequenceNumber }, 'leadership granted');
      if (lobbyState.state) {
        const timerPayload: TimerStatePayload = { state: lobbyState.state };
        io.to(lobby).except(newSocketId).except(oldSocketId ?? '').emit('timer-state', timerPayload);
      }
      lobbyState.pendingTransfer = null;
      persistLobbyState();
    }

    // The old leader sends final state during a transfer
    function handleFinalTimerState(payload: TimerStateUpdatePayload): void {
      if (socket.id !== lobbyState.leaderSocketId) return;
      logger.info({ event: 'final-timer-state', lobby, clientId, sequenceNumber: payload.sequenceNumber }, 'received final state');
      finalizeLeadershipTransfer(payload);
    }

    // Broadcast timer state updates from the current leader
    function handleTimerStateUpdate(payload: TimerStateUpdatePayload): void {
      if (socket.id !== lobbyState.leaderSocketId) return;
      if (payload.sequenceNumber <= lobbyState.lastSequenceNumber) return;
      lobbyState.lastSequenceNumber = payload.sequenceNumber;
      lobbyState.state = payload.state;
      logger.debug({ event: 'timer-state', lobby, clientId, sequenceNumber: payload.sequenceNumber }, 'timer state received');
      const timerPayload: TimerStatePayload = { state: payload.state };
      socket.to(lobby).emit('timer-state', timerPayload);
      persistLobbyState();
    }

    // Clean up when a socket disconnects
    function handleDisconnect(): void {
      logger.info({ event: 'disconnect', lobby, clientId, socketId: socket.id }, 'socket disconnected');
      if (socket.id === lobbyState.leaderSocketId) {
        lobbyState.leaderSocketId = null;
      }
      if (clientId) {
        const clientSocketSet = lobbyState.clientSockets.get(clientId);
        if (clientSocketSet) {
          clientSocketSet.delete(socket.id);
          if (clientSocketSet.size === 0) {
            lobbyState.clientSockets.delete(clientId);
          }
        }
      }
      lobbyState.sockets.delete(socket.id);
      if (lobbyState.sockets.size === 0) {
        lobbyState.timeout = setTimeout(removeInactiveLobby, 24 * 60 * 60 * 1000);
        persistLobbyState();
      }
    }

    // Drop pending transfers that took too long
    function handleTransferTimeout(): void {
      finalizeLeadershipTransfer(null);
    }

    // Remove empty lobbies after a day of inactivity
    function removeInactiveLobby(): void {
      lobbyStateMap.delete(lobby);
      persistLobbyState();
    }

    socket.on('sync-time', handleSyncTime);
    socket.on('check-leadership', handleCheckLeadership);
    socket.on('request-leadership', handleRequestLeadership);
    socket.on('final-timer-state', handleFinalTimerState);
    socket.on('timer-state', handleTimerStateUpdate);
    socket.on('disconnect', handleDisconnect);
  }

  io.on('connection', handleSocketConnection);

  const PORT = process.env.PORT || 3001;
  function logServerListening(): void {
    logger.info({ port: PORT }, 'Socket server listening');
  }
  server.listen(PORT, logServerListening);
}

startServer();
