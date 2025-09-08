/* eslint-disable sort-imports */
import { combineReducers } from '@reduxjs/toolkit';
import { leaderReducer } from './leader/leader.slice';
import { connectionReducer } from './connection/connection.slice';
import { modalReducer } from './modal/modal.slice';
import { timerReducer } from './timer/timer.slice';

export const rootReducer = combineReducers({
  modal: modalReducer,
  timer: timerReducer,
  leader: leaderReducer,
  connection: connectionReducer,
});

export type AppState = ReturnType<typeof rootReducer>;
