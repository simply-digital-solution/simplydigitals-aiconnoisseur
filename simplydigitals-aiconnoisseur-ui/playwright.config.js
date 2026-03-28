import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  timeout: 30000,
  retries: 1,               // one retry on flaky network
  workers: 1,               // sequential — tests share a prod DB
  reporter: [['list'], ['junit', { outputFile: 'playwright-results.xml' }]],
  use: {
    headless: true,
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } },
  ],
})
