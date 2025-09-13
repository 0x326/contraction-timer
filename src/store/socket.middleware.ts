/* eslint-disable sort-imports */
import { Middleware } from '@reduxjs/toolkit';
import { History } from 'history';
import { io, Socket } from 'socket.io-client';
import { connectionActions } from './connection/connection.slice';
import { leaderActions } from './leader/leader.slice';
import { AppState } from './root.reducer';
import { timerActions } from './timer/timer.slice';
import { setServerTimeOffset } from '../utils/now.util';

const getClientId = () => {
  let id = typeof localStorage !== 'undefined' ? localStorage.getItem('clientId') : undefined;
  if (!id) {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
      id = crypto.randomUUID();
    } else {
      id = `${Date.now()}-${Math.random()}`;
    }

    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('clientId', id);
    }
  }
  return id;
};

const clientId = getClientId();


export const createSocketMiddleware = (history: History): Middleware<{}, AppState> => (store) => {
  let seq = 0;
  let pendingStateFromServer: AppState['timer'] | null = null;
  let socket: Socket | null = null;
  let requestLeadershipTimeoutId: ReturnType<typeof setTimeout> | null = null;
  let timeSyncIntervalId: ReturnType<typeof setInterval> | null = null;

  const getLobbyFromPath = (path: string): string | null => path.split('/').filter(Boolean)[0] || null;

  const connect = (lobby: string | null) => {
    if (socket || process.env.NODE_ENV === 'test') return;
    socket = io('http://192.168.0.62:3001', { query: { lobby, clientId } });

    socket.on('timer-state', (timerState) => {
      pendingStateFromServer = timerState;
      if (!store.getState().leader.isLeader) {
        store.dispatch(timerActions.setState(timerState));
        pendingStateFromServer = null;
      }
    });

    socket.on('leadership-info', (payload: { isLeader: boolean; state?: AppState['timer']; seq?: number }) => {
      if (requestLeadershipTimeoutId) {
        clearTimeout(requestLeadershipTimeoutId);
        requestLeadershipTimeoutId = null;
      }
      const { isLeader, state, seq: serverSeq } = payload;
      store.dispatch(leaderActions.setLeader(isLeader));
      if (typeof state !== 'undefined') {
        store.dispatch(timerActions.setState(state));
        pendingStateFromServer = null;
      } else if (!isLeader && pendingStateFromServer) {
        store.dispatch(timerActions.setState(pendingStateFromServer));
        pendingStateFromServer = null;
      }
      if (isLeader && typeof state === 'undefined') {
        seq += 1;
        socket.emit('timer-state', { seq, state: store.getState().timer });
      }
    });

    socket.on('transfer-leadership', () => {
      seq += 1;
      socket.emit('final-timer-state', { seq, state: store.getState().timer });
      store.dispatch(leaderActions.setLeader(false));
    });

    const syncTime = () => {
      const start = Date.now();
      socket!.emit('sync-time', (serverTime: number) => {
        const end = Date.now();
        const offset = serverTime - (start + (end - start) / 2);
        setServerTimeOffset(offset);
      });
    };

    socket.on('connect', () => {
      store.dispatch(connectionActions.setConnected(true));
      syncTime();
      if (timeSyncIntervalId) clearInterval(timeSyncIntervalId);
      timeSyncIntervalId = setInterval(syncTime, 60 * 1000);
      socket.emit('check-leadership');
    });

    socket.on('disconnect', () => {
      store.dispatch(connectionActions.setConnected(false));
      if (timeSyncIntervalId) {
        clearInterval(timeSyncIntervalId);
        timeSyncIntervalId = null;
      }
    });
  };

  const initialLobby = getLobbyFromPath(history.location.pathname) || 'default';
  connect(initialLobby);

  history.listen((location) => {
    if (socket) {
      socket.disconnect();
    }

    setImmediate(() => {
      const lobby = getLobbyFromPath(location.pathname) || 'default';
      if (lobby) {
        connect(lobby);
      }
    });
  });

  return (next) => (action) => {
    const result = next(action);
    const state = store.getState();

    if (socket && socket.connected) {
      if (leaderActions.requestLeadership.match(action)) {
        socket.emit('request-leadership', { seq });
        if (requestLeadershipTimeoutId) clearTimeout(requestLeadershipTimeoutId);
        requestLeadershipTimeoutId = setTimeout(() => {
          if (!store.getState().leader.isLeader) {
            store.dispatch(leaderActions.setLeader(true));
            if (pendingStateFromServer) {
              store.dispatch(timerActions.setState(pendingStateFromServer));
              pendingStateFromServer = null;
            }
          }
          requestLeadershipTimeoutId = null;
        }, 1000);
      }

      if (
        state.leader.isLeader
          && action.type.startsWith('timer/')
          && action.type !== timerActions.setState.type
      ) {
        seq += 1;
        socket.emit('timer-state', { seq, state: state.timer });
      }
    }

    return result;
  };
};
