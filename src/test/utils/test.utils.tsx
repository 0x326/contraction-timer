import { act, render as rtlRender } from '@testing-library/react';
import { appTheme } from '../../theme/app.theme';
import { createStore } from '../../store/app.store';
import { leaderActions } from '../../store/leader/leader.slice';
import { MemoryRouter } from 'react-router-dom';
import moment from 'moment-mini';
import { Provider } from 'react-redux';
import React from 'react';
import { ThemeProvider } from 'styled-components';

export * from '@testing-library/react';
export const mockNow = (timestamp: number) => jest.spyOn(Date, 'now').mockReturnValue(timestamp);

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

export const render = (ui: React.ReactElement, path = '', persistState = false, isLeader = true) => {
  const store = createStore(persistState);
  if (isLeader) {
    store.dispatch(leaderActions.setLeader(true));
  }

  const Wrapper: React.FC = ({ children }) => (
    <MemoryRouter initialEntries={[path]}>
      <Provider store={store}>
        <ThemeProvider theme={appTheme}>
          {children}
        </ThemeProvider>
      </Provider>
    </MemoryRouter>
  );

  return rtlRender(ui, { wrapper: Wrapper });
};
