import fs from 'fs';
import path from 'path';
import Redis from 'ioredis';
import type { TimerState } from '../src/store/timer/timer.slice';
import logger from './logger';

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
      const parsed = data ? (JSON.parse(data) as PersistedState) : {};
      logger.info({ source: 'redis', lobbies: Object.keys(parsed).length }, 'loaded persisted state');
      return parsed;
    } catch (err) {
      logger.error({ err }, 'failed to read state from redis');
      return {};
    }
  }
  try {
    const data = fs.readFileSync(STATE_PATH, 'utf8');
    const parsed = JSON.parse(data) as PersistedState;
    logger.info({ source: 'disk', path: STATE_PATH, lobbies: Object.keys(parsed).length }, 'loaded persisted state');
    return parsed;
  } catch (err) {
    logger.error({ err, path: STATE_PATH }, 'failed to read state from disk');
    return {};
  }
}

export async function writeState(state: PersistedState): Promise<void> {
  if (redis) {
    try {
      await redis.set(KEY, JSON.stringify(state));
      logger.debug({ source: 'redis', lobbies: Object.keys(state).length }, 'persisted state');
    } catch (err) {
      logger.error({ err }, 'failed to write state to redis');
    }
    return;
  }
  const tmp = `${STATE_PATH}.tmp`;
  const dir = path.dirname(STATE_PATH);
  try {
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(tmp, JSON.stringify(state), 'utf8');
    fs.renameSync(tmp, STATE_PATH);
    logger.debug({ source: 'disk', path: STATE_PATH, lobbies: Object.keys(state).length }, 'persisted state');
  } catch (err) {
    logger.error({ err, path: STATE_PATH }, 'failed to write state to disk');
  }
}
