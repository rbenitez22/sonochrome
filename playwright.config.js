// Browser tests (tests/browser/*.spec.js): Chromium and Firefox against a static server of the repo root.
// Run with npm run test:browser, or npm run test:browser:quick to skip the tests tagged @slow.
// The pages load VexFlow, gmp-wasm and fonts from CDNs, so the tests need a network connection.
import { defineConfig } from '@playwright/test';

const PORT = 4173;

export default defineConfig({
  testDir: 'tests/browser',
  testMatch: '*.spec.js',
  timeout: 120_000,
  expect: { timeout: 15_000 },
  fullyParallel: true,
  reporter: [['list']],
  use: { baseURL: `http://localhost:${PORT}`, viewport: { width: 1440, height: 900 }, acceptDownloads: true },
  webServer: {
    command: `node tests/browser/serve.mjs ${PORT}`,
    url: `http://localhost:${PORT}/public/index.html`,
    reuseExistingServer: true,
  },
  projects: [
    { name: 'chromium', use: { browserName: 'chromium', launchOptions: { args: ['--autoplay-policy=no-user-gesture-required'] } } },
    { name: 'firefox', use: { browserName: 'firefox', launchOptions: { firefoxUserPrefs: { 'media.autoplay.default': 0, 'media.autoplay.blocking_policy': 0 } } } },
  ],
});
