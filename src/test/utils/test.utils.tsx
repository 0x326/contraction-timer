/* eslint-disable sort-imports */
import { act, render as rtlRender } from '@testing-library/react';
import { createMemoryHistory } from 'history';
import moment from 'moment-mini';
import React from 'react';
import { Provider } from 'react-redux';
import { Router } from 'react-router-dom';
import { ThemeProvider } from 'styled-components';
import { createStore } from '../../store/app.store';
import { connectionActions } from '../../store/connection/connection.slice';
import { leaderActions } from '../../store/leader/leader.slice';
import { appTheme } from '../../theme/app.theme';
import { setServerTimeOffset } from '../../utils/now.util';

export * from '@testing-library/react';
export const mockNow = (timestamp: number) => {
  setServerTimeOffset(0);
  return jest.spyOn(Date, 'now').mockReturnValue(timestamp);
};

export const startFakeTimer = () => {
  let time = moment('2020-01-01T12:34:59').valueOf();
  mockNow(time);
  jest.useFakeTimers();

  const advanceTime = (duration: number) => act(() => {
    time += duration;
    mockNow(time);
    jest.advanceTimersByTime(duration);
  });

  return advanceTime;
};

export const render = (ui: React.ReactElement, path = '/test/recorder', persistState = false, isLeader = true, isConnected = true) => {
  const history = createMemoryHistory({ initialEntries: [path] });
  const store = createStore(history, persistState);
  if (isLeader) {
    store.dispatch(leaderActions.setLeader(true));
  }
  if (!isConnected) {
    store.dispatch(connectionActions.setConnected(false));
  }

  const Wrapper: React.FC = ({ children }) => (
    <Router history={history}>
      <Provider store={store}>
        <ThemeProvider theme={appTheme}>
          {children}
        </ThemeProvider>
      </Provider>
    </Router>
  );

  return rtlRender(ui, { wrapper: Wrapper });
};
