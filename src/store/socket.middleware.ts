/* eslint-disable sort-imports */
import { Middleware } from '@reduxjs/toolkit';
import { io, Socket } from 'socket.io-client';
import { leaderActions } from './leader/leader.slice';
import { AppState } from './root.reducer';
import { timerActions } from './timer/timer.slice';

export const socketMiddleware: Middleware<{}, AppState> = (store) => {
  let seq = 0;
  const lobby = typeof window !== 'undefined'
    ? window.location.pathname.replace(/^\//, '') || 'default'
    : 'default';
  const socket: Socket | null = typeof window !== 'undefined' && process.env.NODE_ENV !== 'test'
    ? io('http://localhost:3001', { query: { lobby } })
    : null;

  if (socket) {
    socket.on('timer-state', (timerState) => {
      store.dispatch(timerActions.setState(timerState));
    });

    socket.on('leader', (isLeader: boolean) => {
      store.dispatch(leaderActions.setLeader(isLeader));
    });

    socket.on('connect', () => {
      socket.emit('verify-leader');
    });

    socket.on('disconnect', () => {
      store.dispatch(leaderActions.setLeader(false));
    });
  }

  return (next) => (action) => {
    const result = next(action);
    const state = store.getState();

    if (socket) {
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
