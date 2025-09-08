const fs = require('fs');
const path = require('path');

const STATE_PATH = process.env.STATE_PATH || path.join(__dirname, 'state.json');

function readState() {
  try {
    const data = fs.readFileSync(STATE_PATH, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    return {};
  }
}

function writeState(state) {
  const tmp = `${STATE_PATH}.tmp`;
  const dir = path.dirname(STATE_PATH);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(tmp, JSON.stringify(state), 'utf8');
  fs.renameSync(tmp, STATE_PATH);
}

module.exports = { readState, writeState, STATE_PATH };
