import { now, setServerTimeOffset } from './now.util';
import { mockNow } from '../test/utils/test.utils';

describe('now util', () => {
  it('returns the current timestamp with offset applied', () => {
    mockNow(1000000000000);
    setServerTimeOffset(500);

    const result = now();

    expect(result).toEqual(1000000000500);
  });
});
