const fs = require('fs');
const path = require('path');

let redis = null;
if (process.env.REDIS_URL) {
  const Redis = require('ioredis');
  redis = new Redis(process.env.REDIS_URL);
}

const STATE_PATH = process.env.STATE_PATH || path.join(__dirname, 'state.json');
const KEY = 'lobbies';

async function readState() {
  if (redis) {
    try {
      const data = await redis.get(KEY);
      return data ? JSON.parse(data) : {};
    } catch (err) {
      return {};
    }
  }
  try {
    const data = fs.readFileSync(STATE_PATH, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    return {};
  }
}

async function writeState(state) {
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

module.exports = { readState, writeState };
