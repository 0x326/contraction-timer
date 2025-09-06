import { combineReducers } from '@reduxjs/toolkit';
import { leaderReducer } from './leader/leader.slice';
import { modalReducer } from './modal/modal.slice';
import { timerReducer } from './timer/timer.slice';

export const rootReducer = combineReducers({
  modal: modalReducer,
  timer: timerReducer,
  leader: leaderReducer,
});

export type AppState = ReturnType<typeof rootReducer>;
