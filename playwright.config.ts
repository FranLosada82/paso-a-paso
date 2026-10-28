import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'e2e',
  timeout: 120_000,
  reporter: [['list']],
  use: { baseURL: 'http://localhost:4173', serviceWorkers: 'allow' },
  projects: [
    { name: 'tablet-chromium', use: { ...devices['Galaxy Tab S4'] } },
    { name: 'ipad-webkit', use: { ...devices['iPad (gen 7)'] } },
  ],
  webServer: { command: 'npm run preview', url: 'http://localhost:4173', reuseExistingServer: true },
});
