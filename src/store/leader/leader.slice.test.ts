import { leaderActions, leaderReducer, LeaderState } from './leader.slice';

describe('leader reducer', () => {
  it('sets leader flag', () => {
    const state: LeaderState = { isLeader: false };
    const action = leaderActions.setLeader(true);
    expect(leaderReducer(state, action)).toEqual({ isLeader: true });
  });

  it('requestLeadership does not change state', () => {
    const state: LeaderState = { isLeader: false };
    const action = leaderActions.requestLeadership();
    expect(leaderReducer(state, action)).toEqual(state);
  });
});
