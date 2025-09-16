import { createMemoryHistory } from 'history';
import { createStore } from './app.store';
import { leaderActions } from './leader/leader.slice';

describe('socket middleware', () => {
  it('assumes leadership when requesting leadership offline', () => {
    const history = createMemoryHistory({ initialEntries: ['/lobby/recorder'] });
    const store = createStore(history, false);

    store.dispatch(leaderActions.setLeader(false));
    store.dispatch(leaderActions.requestLeadership());

    expect(store.getState().leader.isLeader).toBe(true);
  });
});
