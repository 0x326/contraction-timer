import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'e2e',
  use: {
    headless: true,
  },
  webServer: [
    {
      command: "npx ts-node --compiler-options '{\"module\":\"commonjs\"}' server/index.ts",
      port: 3001,
      reuseExistingServer: !process.env.CI,
    },
    {
      command: 'NODE_OPTIONS=--openssl-legacy-provider npm run build && npx --yes http-server build -p 3000',
      port: 3000,
      timeout: 120000,
      reuseExistingServer: !process.env.CI,
    },
  ],
});
