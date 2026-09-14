import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests', timeout: 90000, expect: { timeout: 15000 }, fullyParallel: false, workers: 1,
  reporter: [['list']], use: { baseURL: 'http://localhost:5175', channel: 'chrome', headless: true, actionTimeout: 15000, trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  webServer: [
    { command: 'node ../server/index.js', url: 'http://localhost:5055/api/health', reuseExistingServer: true, timeout: 30000, env: { APP_MODE: 'MOCK', MOCK_DATABASE: 'MEMORY', PORT: '5055', FRONTEND_URL: 'http://localhost:5175' } },
    { command: 'npm run dev', url: 'http://localhost:5175', reuseExistingServer: true, timeout: 30000, env: { FRONTEND_PORT: '5175', VITE_API_URL: 'http://localhost:5055/api' } },
  ],
});
