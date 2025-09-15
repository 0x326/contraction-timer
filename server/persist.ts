import fs from 'fs';
import path from 'path';
import Redis from 'ioredis';
import type { TimerState } from '../src/store/timer/timer.slice';
import logger from './logger';

const STATE_FILE_PATH = process.env.STATE_PATH || path.join(__dirname, 'state.json');
const KEY = 'lobbies';

export interface PersistedLobby {
  leaderClientId: string | null;
  lastSequenceNumber: number;
  state: TimerState | null;
}

export interface PersistedState {
  [lobby: string]: PersistedLobby;
}

const redisClient: Redis | null = process.env.REDIS_URL
  ? new Redis(process.env.REDIS_URL)
  : null;

// Load lobby state either from Redis or from disk
export async function readState(): Promise<PersistedState> {
  if (redisClient) {
    try {
      const data = await redisClient.get(KEY);
      const parsed = data ? (JSON.parse(data) as PersistedState) : {};
      logger.info({ source: 'redis', lobbies: Object.keys(parsed).length }, 'loaded persisted state');
      return parsed;
    } catch (err) {
      logger.error({ err }, 'failed to read state from redis');
      return {};
    }
  }
  try {
    const data = fs.readFileSync(STATE_FILE_PATH, 'utf8');
    const parsed = JSON.parse(data) as PersistedState;
    logger.info({ source: 'disk', path: STATE_FILE_PATH, lobbies: Object.keys(parsed).length }, 'loaded persisted state');
    return parsed;
  } catch (err) {
    logger.error({ err, path: STATE_FILE_PATH }, 'failed to read state from disk');
    return {};
  }
}

// Persist lobby state to Redis or disk
export async function writeState(state: PersistedState): Promise<void> {
  if (redisClient) {
    try {
      await redisClient.set(KEY, JSON.stringify(state));
      logger.debug({ source: 'redis', lobbies: Object.keys(state).length }, 'persisted state');
    } catch (err) {
      logger.error({ err }, 'failed to write state to redis');
    }
    return;
  }
  const tmp = `${STATE_FILE_PATH}.tmp`;
  const dir = path.dirname(STATE_FILE_PATH);
  try {
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(tmp, JSON.stringify(state), 'utf8');
    fs.renameSync(tmp, STATE_FILE_PATH);
    logger.debug({ source: 'disk', path: STATE_FILE_PATH, lobbies: Object.keys(state).length }, 'persisted state');
  } catch (err) {
    logger.error({ err, path: STATE_FILE_PATH }, 'failed to write state to disk');
  }
}
