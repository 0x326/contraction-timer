/* eslint-disable sort-imports */
import { configureStore } from '@reduxjs/toolkit';
import { History } from 'history';
import persistState from 'redux-localstorage';
import { rootReducer } from './root.reducer';
import { createSocketMiddleware } from './socket.middleware';

export const createStore = (history: History, persist: boolean) => {
  const segments = history.location.pathname.split('/').filter(Boolean);
  const lobby = segments[0];
  const storageKey = lobby ? `redux:${lobby}` : 'redux:default';
  // Type definitions are incorrect, use 'any' to bypass (https://github.com/elgerlambert/redux-localstorage/issues/78)
  const persistStateEnhancer: any = persistState(
    ['timer', lobby ? `${lobby}` : 'default'] as any,
    { key: storageKey } as any
  );

  return configureStore({
    reducer: rootReducer,
    middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(createSocketMiddleware(history)),
    enhancers: persist ? [persistStateEnhancer] : [],
  });
};
