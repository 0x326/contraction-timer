import { leaderActions, leaderReducer, LeaderState } from './leader.slice';

describe('leader reducer', () => {
  it('sets leader flag', () => {
    const state: LeaderState = { isLeader: false };
    const action = leaderActions.setLeader(true);
    expect(leaderReducer(state, action)).toEqual({ isLeader: true });
  });

  it('requestLeader does not change state', () => {
    const state: LeaderState = { isLeader: false };
    const action = leaderActions.requestLeader();
    expect(leaderReducer(state, action)).toEqual(state);
  });
});
