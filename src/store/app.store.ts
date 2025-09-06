import { configureStore } from '@reduxjs/toolkit';
import persistState from 'redux-localstorage';
import { rootReducer } from './root.reducer';
import { socketMiddleware } from './socket.middleware';

// Type definitions are incorrect, use 'any' to bypass (https://github.com/elgerlambert/redux-localstorage/issues/78)
const persistStateEnhancer: any = persistState(['timer'] as any);

export const createStore = (persist: boolean) => configureStore({
  reducer: rootReducer,
  middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(socketMiddleware),
  enhancers: persist ? [persistStateEnhancer] : [],
});
