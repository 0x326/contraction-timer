import { connectionActions, connectionReducer, ConnectionState } from './connection.slice';

describe('connection reducer', () => {
  it('starts disconnected', () => {
    expect(connectionReducer(undefined, { type: 'init' } as any)).toEqual({ connected: false });
  });

  it('sets connection flag', () => {
    const state: ConnectionState = { connected: true };
    const action = connectionActions.setConnected(false);
    expect(connectionReducer(state, action)).toEqual({ connected: false });
  });
});
