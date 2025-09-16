/* eslint-disable sort-imports */
import {
  Middleware,
  MiddlewareAPI,
  AnyAction,
  Dispatch,
} from '@reduxjs/toolkit';
import { History, Location } from 'history';
import { io, Socket } from 'socket.io-client';
import { connectionActions } from './connection/connection.slice';
import { leaderActions } from './leader/leader.slice';
import { AppState } from './root.reducer';
import { timerActions } from './timer/timer.slice';
import type { TimerState } from './timer/timer.slice';
import { setServerTimeOffset } from '../utils/now.util';
import { BACKEND_SERVER_URL } from '../config/backend';
import type {
  LeadershipInfoPayload,
  RequestLeadershipPayload,
  TimerStatePayload,
  TimerStateUpdatePayload,
  SyncTimeResponsePayload,
} from '../socket-events';

export function createSocketMiddleware(history: History): Middleware<{}, AppState> {
  return function socketMiddleware(
    store: MiddlewareAPI<Dispatch<AnyAction>, AppState>
  ) {
    let sequenceNumber = 0;
    let pendingTimerState: TimerState | null = null;
    let socketConnection: Socket | null = null;
    let leadershipRequestTimeout: ReturnType<typeof setTimeout> | null = null;
    let timeSynchronizationInterval: ReturnType<typeof setInterval> | null = null;

    function handleLeadershipRequestTimeout(): void {
      if (!store.getState().leader.isLeader) {
        store.dispatch(leaderActions.setLeader(true));
        if (pendingTimerState) {
          store.dispatch(timerActions.setState(pendingTimerState));
          pendingTimerState = null;
        }
      }
      leadershipRequestTimeout = null;
    }

    // Extract lobby name from the URL path
    function extractLobbyFromPath(path: string): string {
      const segments = path.split('/').filter(Boolean);
      return segments[0] ?? '';
    }

    // Retrieve or generate a persistent client identifier
    function getOrCreateClientId(): string {
      if (typeof localStorage === 'undefined') return '';
      let id = localStorage.getItem('clientId');
      if (!id) {
        if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
          id = (crypto as any).randomUUID();
        } else {
          id = `${Date.now()}-${Math.random()}`;
        }
        localStorage.setItem('clientId', id);
      }
      return id;
    }
    const clientId = getOrCreateClientId();

    // Open a socket connection and wire up handlers
    function initializeSocketConnection(lobby: string): void {
      if (socketConnection || !lobby || typeof window === 'undefined' || process.env.NODE_ENV === 'test') return;
      socketConnection = io(BACKEND_SERVER_URL, { query: { lobby, clientId } });

      function synchronizeTime(): void {
        const start = Date.now();
        function applyServerTime({ serverTime }: SyncTimeResponsePayload): void {
          const end = Date.now();
          const offset = serverTime - (start + (end - start) / 2);
          setServerTimeOffset(offset);
        }
        socketConnection!.emit('sync-time', applyServerTime);
      }

      function handleIncomingTimerState({ state }: TimerStatePayload): void {
        pendingTimerState = state;
        if (!store.getState().leader.isLeader) {
          store.dispatch(timerActions.setState(state));
          pendingTimerState = null;
        }
      }

      function handleLeadershipInfo(payload: LeadershipInfoPayload): void {
        if (leadershipRequestTimeout) {
          clearTimeout(leadershipRequestTimeout);
          leadershipRequestTimeout = null;
        }
        const { isLeader, state, sequenceNumber: serverSequence } = payload;
        if (serverSequence !== undefined) {
          sequenceNumber = serverSequence;
        }
        store.dispatch(leaderActions.setLeader(isLeader));
        if (state !== undefined) {
          store.dispatch(timerActions.setState(state));
          pendingTimerState = null;
        } else if (!isLeader && pendingTimerState) {
          store.dispatch(timerActions.setState(pendingTimerState));
          pendingTimerState = null;
        }
        if (isLeader && state === undefined) {
          sequenceNumber += 1;
          const update: TimerStateUpdatePayload = {
            sequenceNumber,
            state: store.getState().timer,
          };
          socketConnection!.emit('timer-state', update);
        }
      }

      function handleLeadershipTransfer(): void {
        sequenceNumber += 1;
        const finalState: TimerStateUpdatePayload = {
          sequenceNumber,
          state: store.getState().timer,
        };
        socketConnection!.emit('final-timer-state', finalState);
        store.dispatch(leaderActions.setLeader(false));
      }

      function handleConnect(): void {
        store.dispatch(connectionActions.setConnected(true));
        synchronizeTime();
        if (timeSynchronizationInterval) clearInterval(timeSynchronizationInterval);
        timeSynchronizationInterval = setInterval(synchronizeTime, 60 * 1000);
        socketConnection!.emit('check-leadership');
      }

      function handleDisconnect(): void {
        store.dispatch(connectionActions.setConnected(false));
        if (timeSynchronizationInterval) {
          clearInterval(timeSynchronizationInterval);
          timeSynchronizationInterval = null;
        }
      }

      socketConnection.on('timer-state', handleIncomingTimerState);
      socketConnection.on('leadership-info', handleLeadershipInfo);
      socketConnection.on('transfer-leadership', handleLeadershipTransfer);
      socketConnection.on('connect', handleConnect);
      socketConnection.on('disconnect', handleDisconnect);
    }

    const initialLobby = extractLobbyFromPath(history.location.pathname);
    if (initialLobby) {
      initializeSocketConnection(initialLobby);
    }

    function handleLocationChange(location: Location): void {
      if (!socketConnection) {
        const lobby = extractLobbyFromPath(location.pathname);
        if (lobby) {
          initializeSocketConnection(lobby);
        }
      }
    }
    history.listen(handleLocationChange);

    function nextHandler(next: Dispatch<AnyAction>) {
      return function actionHandler(action: AnyAction) {
        const result = next(action);

        if (leaderActions.requestLeadership.match(action)) {
          if (socketConnection && socketConnection.connected) {
            const request: RequestLeadershipPayload = { sequenceNumber };
            socketConnection.emit('request-leadership', request);
            if (leadershipRequestTimeout) clearTimeout(leadershipRequestTimeout);
            leadershipRequestTimeout = setTimeout(handleLeadershipRequestTimeout, 1000);
          } else {
            if (leadershipRequestTimeout) {
              clearTimeout(leadershipRequestTimeout);
              leadershipRequestTimeout = null;
            }
            handleLeadershipRequestTimeout();
          }
        }

        const state = store.getState();

        if (
          socketConnection
          && socketConnection.connected
          && state.leader.isLeader
          && action.type.startsWith('timer/')
          && action.type !== timerActions.setState.type
        ) {
          sequenceNumber += 1;
          const update: TimerStateUpdatePayload = {
            sequenceNumber,
            state: state.timer,
          };
          socketConnection.emit('timer-state', update);
        }

        return result;
      };
    }

    return nextHandler;
  };
}
