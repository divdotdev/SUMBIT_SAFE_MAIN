import { defineConfig } from '@playwright/test';
const apiPort = process.env.TEST_API_PORT || '5055';
const webPort = process.env.TEST_WEB_PORT || '5175';
export default defineConfig({
  testDir: './tests', timeout: 90000, expect: { timeout: 15000 }, fullyParallel: false, workers: 1,
  reporter: [['list']], use: { baseURL: `http://localhost:${webPort}`, channel: 'chrome', headless: true, actionTimeout: 15000, trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  webServer: [
    { command: 'node ../server/index.js', url: `http://localhost:${apiPort}/api/health`, reuseExistingServer: false, timeout: 30000, env: { APP_MODE: 'MOCK', AI_PROVIDER: 'MOCK', MOCK_DATABASE: 'MEMORY', PORT: apiPort, FRONTEND_URL: `http://localhost:${webPort}` } },
    { command: 'npm run dev', url: `http://localhost:${webPort}`, reuseExistingServer: false, timeout: 30000, env: { FRONTEND_PORT: webPort, VITE_API_URL: `http://localhost:${apiPort}/api` } },
  ],
});
