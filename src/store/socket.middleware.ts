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
  const socket: Socket | null = typeof window !== 'undefined' && process.env.NODE_ENV !== 'test'
    ? io('http://localhost:3001', { query: { lobby } })
    : null;

  if (socket) {
    socket.on('timer-state', (timerState) => {
      pendingState = timerState;
      if (!store.getState().leader.isLeader) {
        store.dispatch(timerActions.setState(timerState));
        pendingState = null;
      }
    });

    socket.on('leader', (isLeader: boolean) => {
      store.dispatch(leaderActions.setLeader(isLeader));
      if (!isLeader && pendingState) {
        store.dispatch(timerActions.setState(pendingState));
        pendingState = null;
      }
    });

    socket.on('connect', () => {
      store.dispatch(connectionActions.setConnected(true));
      socket.emit('verify-leader');
    });

    socket.on('disconnect', () => {
      store.dispatch(connectionActions.setConnected(false));
    });
  }

  return (next) => (action) => {
    const result = next(action);
    const state = store.getState();

    if (socket && socket.connected) {
      if (leaderActions.requestLeader.match(action)) {
        socket.emit('request-leader');
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
