/* eslint-disable sort-imports */
import { Middleware } from '@reduxjs/toolkit';
import { History } from 'history';
import { io, Socket } from 'socket.io-client';
import { connectionActions } from './connection/connection.slice';
import { leaderActions } from './leader/leader.slice';
import { AppState } from './root.reducer';
import { timerActions } from './timer/timer.slice';

export const createSocketMiddleware = (history: History): Middleware<{}, AppState> => (store) => {
  let seq = 0;
  let pendingState: AppState['timer'] | null = null;
  let socket: Socket | null = null;
  let leadershipTimeout: ReturnType<typeof setTimeout> | null = null;

  const getLobbyFromPath = (path: string) => path.split('/').filter(Boolean)[0];

  const getClientId = () => {
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
  };
  const clientId = getClientId();

  const connect = (lobby: string) => {
    if (socket || !lobby || typeof window === 'undefined' || process.env.NODE_ENV === 'test') return;
    socket = io('http://localhost:3001', { query: { lobby, clientId } });

    socket.on('timer-state', (timerState) => {
      pendingState = timerState;
      if (!store.getState().leader.isLeader) {
        store.dispatch(timerActions.setState(timerState));
        pendingState = null;
      }
    });

    socket.on('leadership-info', (payload: { isLeader: boolean; state?: AppState['timer']; seq?: number }) => {
      if (leadershipTimeout) {
        clearTimeout(leadershipTimeout);
        leadershipTimeout = null;
      }
      const { isLeader, state, seq: serverSeq } = payload;
      if (typeof serverSeq === 'number') {
        seq = serverSeq;
      }
      store.dispatch(leaderActions.setLeader(isLeader));
      if (typeof state !== 'undefined') {
        store.dispatch(timerActions.setState(state));
        pendingState = null;
      } else if (!isLeader && pendingState) {
        store.dispatch(timerActions.setState(pendingState));
        pendingState = null;
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

    socket.on('connect', () => {
      store.dispatch(connectionActions.setConnected(true));
      socket.emit('check-leadership');
    });

    socket.on('disconnect', () => {
      store.dispatch(connectionActions.setConnected(false));
    });
  };

  const initialLobby = getLobbyFromPath(history.location.pathname);
  if (initialLobby) {
    connect(initialLobby);
  }

  history.listen((location) => {
    if (!socket) {
      const lobby = getLobbyFromPath(location.pathname);
      if (lobby) {
        connect(lobby);
      }
    }
  });

  return (next) => (action) => {
    const result = next(action);
    const state = store.getState();

    if (socket && socket.connected) {
      if (leaderActions.requestLeadership.match(action)) {
        socket.emit('request-leadership', { seq });
        if (leadershipTimeout) clearTimeout(leadershipTimeout);
        leadershipTimeout = setTimeout(() => {
          if (!store.getState().leader.isLeader) {
            store.dispatch(leaderActions.setLeader(true));
            if (pendingState) {
              store.dispatch(timerActions.setState(pendingState));
              pendingState = null;
            }
          }
          leadershipTimeout = null;
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
