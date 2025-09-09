import fs from 'fs';
import path from 'path';
import Redis from 'ioredis';
import type { TimerState } from '../src/store/timer/timer.slice';

const STATE_PATH = process.env.STATE_PATH || path.join(__dirname, 'state.json');
const KEY = 'lobbies';

export interface PersistedLobby {
  leaderClientId: string | null;
  lastSeq: number;
  state: TimerState | null;
}

export interface PersistedState {
  [lobby: string]: PersistedLobby;
}

let redis: any = null;
if (process.env.REDIS_URL) {
  redis = new Redis(process.env.REDIS_URL);
}

export async function readState(): Promise<PersistedState> {
  if (redis) {
    try {
      const data = await redis.get(KEY);
      return data ? (JSON.parse(data) as PersistedState) : {};
    } catch {
      return {};
    }
  }
  try {
    const data = fs.readFileSync(STATE_PATH, 'utf8');
    return JSON.parse(data) as PersistedState;
  } catch {
    return {};
  }
}

export async function writeState(state: PersistedState): Promise<void> {
  if (redis) {
    await redis.set(KEY, JSON.stringify(state));
    return;
  }
  const tmp = `${STATE_PATH}.tmp`;
  const dir = path.dirname(STATE_PATH);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(tmp, JSON.stringify(state), 'utf8');
  fs.renameSync(tmp, STATE_PATH);
}
