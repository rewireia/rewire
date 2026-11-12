import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { ConfigError } from '../src/config.ts';
import { webFiles } from '../src/http/web-files.ts';

import { createTestApi, expectProblem, type TestApi } from './support/test-api.ts';

/** The folder of the API package, which a relative folder of the web starts at. */
const API_PACKAGE = fileURLToPath(new URL('../', import.meta.url));

const INDEX = '<!doctype html><title>Rewire</title><div id="root"></div>';
/** Long enough to be worth compressing. */
const SCRIPT = `console.log(${JSON.stringify('rewire '.repeat(400))});`;
/** What a file next to the folder of the web holds, and no answer may carry. */
const KEPT_OUT = 'not for the web';

let webRoot: string;
let api: TestApi;

beforeAll(async () => {
  webRoot = await mkdtemp(path.join(tmpdir(), 'rewire-web-'));
  await mkdir(path.join(webRoot, 'assets'));
  await writeFile(path.join(webRoot, 'index.html'), INDEX);
  await writeFile(path.join(webRoot, 'assets', 'app-4f2a.js'), SCRIPT);
  // Given as a deployment gives it: relative to the API package.
  api = await createTestApi({ environment: { WEB_ROOT: path.relative(API_PACKAGE, webRoot) } });
});

afterAll(async () => {
  await api.close();
  await rm(webRoot, { recursive: true, force: true });
});

describe('a server that serves the web too', () => {
  it('answers the home page, to be checked with the server before every use', async () => {
    const response = await api.app.request('/');
    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toContain('text/html');
    expect(response.headers.get('Cache-Control')).toBe('no-cache');
    expect(await response.text()).toBe(INDEX);
  });

  it('lets the browser keep for good a file named after its content', async () => {
    const response = await api.app.request('/assets/app-4f2a.js');
    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toBe('public, max-age=31536000, immutable');
    expect(await response.text()).toBe(SCRIPT);
  });

  it('answers a page of the web application with the home page, which routes it', async () => {
    for (const page of ['/us/plan/4313', '/dashboard']) {
      const response = await api.app.request(page);
      expect(response.status, page).toBe(200);
      expect(response.headers.get('Cache-Control'), page).toBe('no-cache');
      expect(await response.text(), page).toBe(INDEX);
    }
  });

  it('does not answer a missing script with the home page', async () => {
    const response = await api.app.request('/assets/no-such-file.js');
    expect(response.headers.get('Cache-Control')).toBeNull();
    await expectProblem(response, 404, 'not_found');
  });

  it('never takes a wrong address of the API for a page', async () => {
    await expectProblem(await api.app.request('/api/no-such-route'), 404, 'not_found');
    await expectProblem(
      await api.app.request('/api/health', { method: 'DELETE' }),
      404,
      'not_found',
    );
  });

  it('serves no file from outside the folder of the web', async () => {
    const outside = path.join(webRoot, '..', 'rewire-outside.txt');
    await writeFile(outside, KEPT_OUT);
    try {
      for (const address of [
        '/..%2frewire-outside.txt',
        '/assets/..%2f..%2frewire-outside.txt',
        '/assets/..%5c..%5crewire-outside.txt',
      ]) {
        const response = await api.app.request(address);
        expect(await response.text(), address).not.toContain(KEPT_OUT);
      }
    } finally {
      await rm(outside, { force: true });
    }
  });

  it('answers a write outside the API with a problem, not a page', async () => {
    await expectProblem(await api.app.request('/dashboard', { method: 'POST' }), 404, 'not_found');
  });

  it('answers again with nothing when the browser already holds the page', async () => {
    const first = await api.app.request('/');
    const tag = first.headers.get('ETag');
    expect(tag).not.toBeNull();
    const second = await api.app.request('/', { headers: { 'If-None-Match': tag ?? '' } });
    expect(second.status).toBe(304);
    expect(await second.text()).toBe('');
  });

  it('answers a question about a file without sending it, and a part of it when asked', async () => {
    const head = await api.app.request('/assets/app-4f2a.js', { method: 'HEAD' });
    expect(head.status).toBe(200);
    expect(head.headers.get('Content-Length')).toBe(String(SCRIPT.length));
    expect(await head.text()).toBe('');

    const part = await api.app.request('/assets/app-4f2a.js', { headers: { Range: 'bytes=0-9' } });
    expect(part.status).toBe(206);
    expect(await part.text()).toBe(SCRIPT.slice(0, 10));
  });

  it('compresses what the browser says it can read compressed', async () => {
    const response = await api.app.request('/assets/app-4f2a.js', {
      headers: { 'Accept-Encoding': 'gzip' },
    });
    expect(response.headers.get('Content-Encoding')).toBe('gzip');
  });

  it('lets the window PayPal opens answer the page that opened it', async () => {
    const response = await api.app.request('/');
    expect(response.headers.get('Cross-Origin-Opener-Policy')).toBe('same-origin-allow-popups');
  });
});

describe('a folder that holds no build of the web', () => {
  it('stops the server from starting', async () => {
    const empty = await mkdtemp(path.join(tmpdir(), 'rewire-no-web-'));
    try {
      expect(() => webFiles(empty)).toThrow(ConfigError);
      expect(() => webFiles(empty)).toThrow(/WEB_ROOT/);
    } finally {
      await rm(empty, { recursive: true, force: true });
    }
  });
});

describe('a server that answers the API only', () => {
  it('has no page to give', async () => {
    const apiOnly = await createTestApi();
    try {
      await expectProblem(await apiOnly.app.request('/'), 404, 'not_found');
      await expectProblem(await apiOnly.app.request('/dashboard'), 404, 'not_found');
    } finally {
      await apiOnly.close();
    }
  });
});
