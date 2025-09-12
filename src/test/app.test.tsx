import { cleanup, fireEvent, render, screen, startFakeTimer, within } from './utils/test.utils';
import { App } from '../components/app/app.component';
import React from 'react';

const noop = () => {};
const localStorageKey = 'redux:test';
const localStorageData = JSON.stringify({
  timer: {
    running: true,
    contractions: [
      { start: 1577882099000, duration: 1000 },
    ],
  },
});

describe('App tests', () => {
  test('renders the outer app layout', () => {
    render(<App />);

    expect(screen.getByRole('banner')).toBeInTheDocument();
    expect(screen.getByRole('main')).toBeInTheDocument();
    expect(screen.getByRole('navigation')).toBeInTheDocument();
  });

  test('prompts to join a lobby when none specified', () => {
    render(<App />, '/');
    expect(screen.getByRole('dialog', { name: /join a lobby/i })).toBeInTheDocument();
  });

  test('displays the correct background colour for the current status', () => {
    render(<App />);

    const layout = screen.getByTestId('layout');

    expect(layout).toHaveStyle('background-color: #008571');

    fireEvent.click(screen.getByRole('button', { name: /start/i }));
    expect(layout).toHaveStyle('background-color: #ba125e');

    fireEvent.click(screen.getByRole('button', { name: /stop/i }));
    expect(layout).toHaveStyle('background-color: #107cb1');
  });

  test('dims the background when a non-leader is disconnected', () => {
    render(<App />, '/test/recorder', false, false, false);

    const layout = screen.getByTestId('layout');

    expect(layout).toHaveStyle('background-color: #217e70');
  });

  test('dims the background when the leader is disconnected', () => {
    render(<App />, '/test/recorder', false, true, false);

    const layout = screen.getByTestId('layout');

    expect(layout).toHaveStyle('background-color: #217e70');
  });

  test('applies focus styles when hitting tab and removes them when using a mouse', () => {
    const { baseElement } = render(<App />);

    expect(baseElement).not.toHaveClass('focus-outlines');

    fireEvent.keyDown(baseElement, { key: 'Enter' });

    expect(baseElement).not.toHaveClass('focus-outlines');

    fireEvent.keyDown(baseElement, { key: 'Tab' });

    expect(baseElement).toHaveClass('focus-outlines');

    fireEvent.click(baseElement, { clientX: 123, clientY: 321 });

    expect(baseElement).not.toHaveClass('focus-outlines');
  });

  test('displays the timer view by default', () => {
    render(<App />);

    expect(screen.getByRole('heading', { name: /timer/i })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /history/i })).not.toBeInTheDocument();
  });

  test('displays the timer view for an unrecognised URI', () => {
    render(<App />, '/test/recorder/foobar');

    expect(screen.getByRole('heading', { name: /timer/i })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /history/i })).not.toBeInTheDocument();
  });

  test('navigates between views', () => {
    render(<App />);

    const historyLink = screen.getByRole('link', { name: /history/i });

    fireEvent.click(historyLink);

    expect(screen.getByRole('heading', { name: /history/i })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /timer/i })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /history/i })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: /timer/i })).not.toHaveAttribute('aria-current');

    fireEvent.click(screen.getByRole('link', { name: /timer/i }));

    expect(screen.getByRole('heading', { name: /timer/i })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /history/i })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /timer/i })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: /history/i })).not.toHaveAttribute('aria-current');
  });

  test('displays the phase time and status', () => {
    const advanceTime = startFakeTimer();

    render(<App />);

    const phaseTime = screen.getByLabelText(/phase time/i);
    const status = screen.getByLabelText(/status/i);

    advanceTime(1000);

    expect(phaseTime).toHaveTextContent('0:00');
    expect(status).toHaveTextContent(/ready/i);

    fireEvent.click(screen.getByRole('button', { name: /start/i }));

    advanceTime(1000);

    expect(phaseTime).toHaveTextContent('0:01');
    expect(status).toHaveTextContent(/contraction/i);

    fireEvent.click(screen.getByRole('button', { name: /stop/i }));

    advanceTime(2000);

    expect(phaseTime).toHaveTextContent('0:02');
    expect(status).toHaveTextContent(/rest/i);

    fireEvent.click(screen.getByRole('button', { name: /take a break/i }));

    advanceTime(1000);

    expect(phaseTime).toHaveTextContent('0:00');
    expect(status).toHaveTextContent(/ready/i);
  });

  test('displays the average duration and interval', () => {
    const advanceTime = startFakeTimer();

    render(<App />);

    const averages = screen.getByLabelText(/one hour averages/i);
    const duration = within(averages).getByLabelText(/duration/i);
    const interval = within(averages).getByLabelText(/interval/i);

    expect(averages).toBeInTheDocument();
    expect(duration).toHaveTextContent('0:00');
    expect(interval).toHaveTextContent('0:00');

    fireEvent.click(screen.getByRole('button', { name: /start/i }));
    advanceTime(1000);
    fireEvent.click(screen.getByRole('button', { name: /stop/i }));
    advanceTime(2000);
    fireEvent.click(screen.getByRole('button', { name: /start/i }));
    advanceTime(2000);
    fireEvent.click(screen.getByRole('button', { name: /stop/i }));
    advanceTime(3000);
    fireEvent.click(screen.getByRole('button', { name: /start/i }));
    advanceTime(3000);
    fireEvent.click(screen.getByRole('button', { name: /stop/i }));

    expect(duration).toHaveTextContent('0:02');
    expect(interval).toHaveTextContent('0:04');
  });

  test('displays controls correctly', () => {
    render(<App />);

    const pause = screen.getByRole('button', { name: /take a break/i });

    expect(screen.getByRole('button', { name: /start/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /stop/i })).not.toBeInTheDocument();
    expect(pause).toBeInTheDocument();
    expect(pause).toHaveAttribute('disabled');

    fireEvent.click(screen.getByRole('button', { name: /start/i }));

    expect(screen.getByRole('button', { name: /stop/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /start/i })).not.toBeInTheDocument();
    expect(pause).toBeInTheDocument();
    expect(pause).not.toHaveAttribute('disabled');

    fireEvent.click(screen.getByRole('button', { name: /stop/i }));

    expect(screen.getByRole('button', { name: /start/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /stop/i })).not.toBeInTheDocument();
    expect(pause).toBeInTheDocument();
    expect(pause).not.toHaveAttribute('disabled');

    fireEvent.click(screen.getByRole('button', { name: /take a break/i }));

    expect(screen.getByRole('button', { name: /start/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /stop/i })).not.toBeInTheDocument();
    expect(pause).toBeInTheDocument();
    expect(pause).toHaveAttribute('disabled');
  });

  test('disables timer controls when not the leader', () => {
    render(<App />, '/test/recorder', false, false);

    expect(screen.getByRole('button', { name: /start/i })).toHaveAttribute('disabled');
    expect(screen.getByRole('button', { name: /take a break/i })).toHaveAttribute('disabled');
  });

  test('shows leader button only for recorder role', () => {
    render(<App />, '/test/recorder', false, false);
    expect(screen.getByRole('button', { name: /become leader/i })).toBeInTheDocument();
    cleanup();

    render(<App />, '/test/monitor', false, false);
    expect(screen.queryByRole('button', { name: /become leader/i })).not.toBeInTheDocument();
  });

  test('displays empty history when there are no completed contractions', () => {
    render(<App />);

    fireEvent.click(screen.getByRole('link', { name: /history/i }));

    const clear = screen.getByRole('button', { name: /clear/i });

    expect(screen.getByText(/your completed contractions will appear here/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/contraction history/i)).not.toBeInTheDocument();
    expect(clear).toBeInTheDocument();
    expect(clear).toHaveAttribute('disabled');
  });

  test('displays contraction history when there are completed contractions', () => {
    const advanceTime = startFakeTimer();

    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: /start/i }));
    advanceTime(1000);
    fireEvent.click(screen.getByRole('button', { name: /stop/i }));
    advanceTime(2000);
    fireEvent.click(screen.getByRole('button', { name: /start/i }));
    advanceTime(3000);
    fireEvent.click(screen.getByRole('button', { name: /take a break/i }));
    advanceTime(4000);
    fireEvent.click(screen.getByRole('button', { name: /start/i }));
    advanceTime(5000);
    fireEvent.click(screen.getByRole('button', { name: /take a break/i }));
    fireEvent.click(screen.getByRole('link', { name: /history/i }));

    const history = screen.getByRole('list', { name: /contraction history/i });
    const historyItems = within(history).getAllByRole('listitem');
    const clear = screen.getByRole('button', { name: /clear/i });

    expect(screen.queryByText(/your completed contractions will appear here/i)).not.toBeInTheDocument();
    expect(history).toBeInTheDocument();
    expect(historyItems).toHaveLength(5);
    expect(historyItems[0]).toHaveTextContent('0:05');
    expect(historyItems[0]).toHaveTextContent('12:35pm, today');
    expect(historyItems[1]).toHaveTextContent('');
    expect(historyItems[2]).toHaveTextContent('0:03');
    expect(historyItems[2]).toHaveTextContent('12:35pm, today');
    expect(historyItems[3]).toHaveTextContent('0:03');
    expect(historyItems[4]).toHaveTextContent('0:01');
    expect(historyItems[4]).toHaveTextContent('12:34pm, today');
    expect(clear).toBeInTheDocument();
    expect(clear).not.toHaveAttribute('disabled');
  });

  test('allows contraction history to be cleared', () => {
    const advanceTime = startFakeTimer();

    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: /start/i }));
    advanceTime(1000);
    fireEvent.click(screen.getByRole('button', { name: /stop/i }));
    fireEvent.click(screen.getByRole('link', { name: /history/i }));

    expect(screen.getByRole('list', { name: /contraction history/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /clear/i }));

    expect(screen.getByRole('dialog', { name: /clear history/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /confirm/i }));

    expect(screen.queryByRole('dialog', { name: /clear history/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('list', { name: /contraction history/i })).not.toBeInTheDocument();
  });

  test('allows clear history modal to be closed without action', () => {
    const advanceTime = startFakeTimer();

    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: /start/i }));
    advanceTime(1000);
    fireEvent.click(screen.getByRole('button', { name: /stop/i }));
    fireEvent.click(screen.getByRole('link', { name: /history/i }));

    expect(screen.getByRole('list', { name: /contraction history/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /clear/i }));

    expect(screen.getByRole('dialog', { name: /clear history/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));

    expect(screen.queryByRole('dialog', { name: /clear history/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('list', { name: /contraction history/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /clear/i }));

    expect(screen.getByRole('dialog', { name: /clear history/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /close/i }));

    expect(screen.queryByRole('dialog', { name: /clear history/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('list', { name: /contraction history/i })).toBeInTheDocument();
  });

  test('saves state to localStorage', () => {
    const advanceTime = startFakeTimer();
    jest.spyOn(Object.getPrototypeOf(localStorage), 'setItem').mockImplementation(noop);

    render(<App />, undefined, true);

    fireEvent.click(screen.getByRole('button', { name: /start/i }));
    advanceTime(1000);
    fireEvent.click(screen.getByRole('button', { name: /stop/i }));

    expect(localStorage.setItem).toHaveBeenLastCalledWith(localStorageKey, localStorageData);
  });

  test('loads state from localStorage', () => {
    startFakeTimer();
    jest.spyOn(Object.getPrototypeOf(localStorage), 'getItem').mockReturnValue(localStorageData);

    render(<App />, undefined, true);

    fireEvent.click(screen.getByRole('link', { name: /history/i }));

    const history = screen.getByRole('list', { name: /contraction history/i });
    const historyItems = within(history).getAllByRole('listitem');

    expect(screen.queryByText(/your completed contractions will appear here/i)).not.toBeInTheDocument();
    expect(history).toBeInTheDocument();
    expect(historyItems).toHaveLength(1);
    expect(historyItems[0]).toHaveTextContent('0:01');
    expect(historyItems[0]).toHaveTextContent('12:34pm, today');
  });

  test('allows a contraction to be deleted individually', () => {
    const advanceTime = startFakeTimer();

    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: /start/i }));
    advanceTime(1000);
    fireEvent.click(screen.getByRole('button', { name: /stop/i }));

    fireEvent.click(screen.getByRole('link', { name: /history/i }));
    fireEvent.click(screen.getByRole('button', { name: /delete/i }));
    fireEvent.click(screen.getByRole('button', { name: /confirm/i }));

    expect(screen.getByText(/your completed contractions will appear here/i)).toBeInTheDocument();
  });
});
