import { combineReducers } from '@reduxjs/toolkit';
import { modalReducer } from './modal/modal.slice';
import { sessionReducer } from './session/session.slice';
import { timerReducer } from './timer/timer.slice';

export const rootReducer = combineReducers({
  modal: modalReducer,
  timer: timerReducer,
  session: sessionReducer,
});

export type AppState = ReturnType<typeof rootReducer>;
