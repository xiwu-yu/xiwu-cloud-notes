import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  expect: { timeout: 5_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [['list'], ['html', { open: 'never' }]],
  outputDir: 'test-results',
  use: {
    baseURL: 'http://127.0.0.1:4174/xiwu-cloud-notes/',
    ...(process.env.PW_CHANNEL ? { channel: process.env.PW_CHANNEL } : {}),
    ...(process.env.PW_BROWSER ? { browserName: process.env.PW_BROWSER } : {}),
    headless: true,
    locale: 'zh-CN',
    colorScheme: 'light',
    viewport: { width: 1440, height: 900 },
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure'
  },
  projects: [
    { name: 'interaction', testMatch: ['site.spec.mjs', 'music.spec.mjs', 'navigation.spec.mjs', 'recovery.spec.mjs', 'design.spec.mjs'] },
    { name: 'content-smoke', testMatch: 'content-smoke.spec.mjs', use: { baseURL: 'http://127.0.0.1:4173/xiwu-cloud-notes/' } }
  ],
  webServer: [
    { command: 'node scripts/build.mjs && node scripts/serve.mjs', url: 'http://127.0.0.1:4173', reuseExistingServer: false, timeout: 60_000 },
    { command: 'node scripts/e2e-serve.mjs', url: 'http://127.0.0.1:4174', reuseExistingServer: false, timeout: 60_000 }
  ]
});
