import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'e2e',
  use: {
    headless: true,
  },
  webServer: [
    {
      command: 'node server/index.js',
      port: 3001,
      reuseExistingServer: !process.env.CI,
    },
    {
      command: 'NODE_OPTIONS=--openssl-legacy-provider BROWSER=none PORT=3000 npm start',
      port: 3000,
      timeout: 120000,
      reuseExistingServer: !process.env.CI,
    },
  ],
});
