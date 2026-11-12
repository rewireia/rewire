import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { defineConfig, devices } from '@playwright/test';

const API_PORT = 8290;
const WEB_PORT = 5290;
const WEB_ORIGIN = `http://127.0.0.1:${WEB_PORT}`;
const reuse = process.env['CI'] === undefined;
/** The root of the repository, where the servers are started from. */
const ROOT = fileURLToPath(new URL('../../', import.meta.url));

/** End-to-end journeys: the web over the real API, with PayPal faked in memory. */
export default defineConfig({
  testDir: '.',
  // The sandbox purchase has its own configuration: see live/README.md.
  testIgnore: ['live/**'],
  // Traces and screenshots of failures stay out of the repository.
  outputDir: path.join(tmpdir(), 'rewire-e2e-results'),
  fullyParallel: false,
  workers: 1,
  forbidOnly: !reuse,
  retries: 0,
  reporter: 'list',
  use: {
    baseURL: WEB_ORIGIN,
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    {
      command: 'node_modules/.bin/tsx --conditions=rewire-source tests/e2e/support/test-server.ts',
      cwd: ROOT,
      env: { PORT: String(API_PORT), PUBLIC_ORIGIN: WEB_ORIGIN },
      url: `http://127.0.0.1:${API_PORT}/api/health`,
      reuseExistingServer: false,
    },
    {
      command: `../../node_modules/.bin/vite --port ${WEB_PORT} --strictPort`,
      cwd: path.join(ROOT, 'apps/web'),
      env: { API_ORIGIN: `http://127.0.0.1:${API_PORT}` },
      url: WEB_ORIGIN,
      reuseExistingServer: false,
    },
  ],
});
