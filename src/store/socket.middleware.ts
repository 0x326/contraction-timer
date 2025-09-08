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
  const params = new URLSearchParams(history.location.search);
  const lobby = params.get('lobby') || 'default';

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

  if (typeof localStorage !== 'undefined') {
    const saved = localStorage.getItem('seq');
    if (saved) seq = Number(saved) || 0;
  }

  const clientId = getClientId();
  const socket: Socket | null = typeof window !== 'undefined' && process.env.NODE_ENV !== 'test'
    ? io('http://localhost:3001', { query: { lobby, clientId } })
    : null;

  const saveSeq = () => {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('seq', String(seq));
    }
  };

  if (socket) {
    socket.on('timer-state', (timerState) => {
      pendingState = timerState;
      if (!store.getState().leader.isLeader) {
        store.dispatch(timerActions.setState(timerState));
        pendingState = null;
      }
    });

    socket.on('leadership-info', (payload: { isLeader: boolean; state?: AppState['timer'] }) => {
      const { isLeader, state } = payload;
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
        saveSeq();
        socket.emit('timer-state', { seq, state: store.getState().timer });
      }
    });

    socket.on('transfer-leadership', () => {
      seq += 1;
      saveSeq();
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
  }

  return (next) => (action) => {
    const result = next(action);
    const state = store.getState();

    if (socket && socket.connected) {
      if (leaderActions.requestLeadership.match(action)) {
        socket.emit('request-leadership', { seq });
      }

      if (
        state.leader.isLeader
          && action.type.startsWith('timer/')
          && action.type !== timerActions.setState.type
      ) {
        seq += 1;
        saveSeq();
        socket.emit('timer-state', { seq, state: state.timer });
      }
    }

    return result;
  };
};
