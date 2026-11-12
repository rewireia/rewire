import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { defineConfig } from '@playwright/test';

const API_PORT = 8295;
const WEB_PORT = 5295;
const WEB_ORIGIN = `http://127.0.0.1:${WEB_PORT}`;
/** The root of the repository, where the servers are started from and `.env` lives. */
const ROOT = fileURLToPath(new URL('../../../', import.meta.url));
const ENV_FILE = path.join(ROOT, '.env');

try {
  // The sandbox credentials and buyer: read here, never written anywhere.
  process.loadEnvFile(ENV_FILE);
} catch {
  // Without `.env` the purchase is skipped and says which variables it needs.
}

// A throw-away database for the real API. Workers read this config again: they reuse it.
process.env['REWIRE_LIVE_DATABASE'] ??= path.join(
  mkdtempSync(path.join(tmpdir(), 'rewire-live-')),
  'live.db',
);

/** A purchase and a refund in PayPal's sandbox, through the real API and the web. */
export default defineConfig({
  testDir: '.',
  outputDir: path.join(tmpdir(), 'rewire-live-results'),
  workers: 1,
  // A failed assertion must never repeat a payment that may already have succeeded.
  retries: 0,
  timeout: 600_000,
  reporter: 'list',
  use: {
    baseURL: WEB_ORIGIN,
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Safari/537.36',
    extraHTTPHeaders: {
      'sec-ch-ua': '"Not:A-Brand";v="8", "Chromium";v="156", "Google Chrome";v="156"',
      'sec-ch-ua-mobile': '?0',
      'sec-ch-ua-platform': '"Windows"',
    },
    // Nothing of the buyer's session is kept: no trace, no screenshot, no video.
    trace: 'off',
    screenshot: 'off',
    video: 'off',
  },
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
  webServer: [
    {
      command:
        'node_modules/.bin/tsx --conditions=rewire-source --env-file-if-exists=.env apps/api/src/main.ts',
      cwd: ROOT,
      env: {
        PAYPAL_ENV: 'sandbox',
        PORT: String(API_PORT),
        PUBLIC_ORIGIN: WEB_ORIGIN,
        DATABASE_URL: `file:${process.env['REWIRE_LIVE_DATABASE']}`,
      },
      url: `http://127.0.0.1:${API_PORT}/api/health`,
      reuseExistingServer: false,
      timeout: 60_000,
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
