/* eslint-disable sort-imports */
import { configureStore } from '@reduxjs/toolkit';
import { History } from 'history';
import persistState from 'redux-localstorage';
import { rootReducer } from './root.reducer';
import { createSocketMiddleware } from './socket.middleware';

export const createStore = (history: History, persist: boolean) => {
  const segments = history.location.pathname.split('/').filter(Boolean);
  const lobby = segments[0];
  // Type definitions are incorrect, use 'any' to bypass (https://github.com/elgerlambert/redux-localstorage/issues/78)
  const persistStateEnhancer: any = persistState(['timer'] as any, {
    key: lobby ? `redux:${lobby}` : 'redux',
  });

  return configureStore({
    reducer: rootReducer,
    middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(createSocketMiddleware(history)),
    enhancers: persist ? [persistStateEnhancer] : [],
  });
};
