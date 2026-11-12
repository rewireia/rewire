import type { Hono } from 'hono';
import { expect } from 'vitest';
import type { z } from 'zod';

import type { HttpEnvironment } from '../../src/http/environment.ts';

/** A browser in a test: it calls the app and keeps the session cookie between calls. */
export interface TestClient {
  get(path: string, headers?: Record<string, string>): Promise<Response>;
  post(path: string, body?: unknown, headers?: Record<string, string>): Promise<Response>;
  put(path: string, body: unknown, headers?: Record<string, string>): Promise<Response>;
  /** The session cookie as the browser sends it, or `undefined` before the first save. */
  cookie: string | undefined;
}

export function createTestClient(app: Hono<HttpEnvironment>): TestClient {
  const client: TestClient = {
    cookie: undefined,
    get: (path, headers) => send('GET', path, undefined, headers),
    post: (path, body, headers) => send('POST', path, body, headers),
    put: (path, body, headers) => send('PUT', path, body, headers),
  };

  async function send(
    method: string,
    path: string,
    body: unknown,
    headers: Record<string, string> = {},
  ): Promise<Response> {
    const response = await app.request(path, {
      method,
      headers: {
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
        ...(client.cookie === undefined ? {} : { Cookie: client.cookie }),
        ...headers,
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    const cookies = new Map(
      (client.cookie ?? '')
        .split('; ')
        .filter(Boolean)
        .map((part) => {
          const split = part.indexOf('=');
          return [part.slice(0, split), part.slice(split + 1)];
        }),
    );
    for (const cookie of response.headers.getSetCookie()) {
      const pair = cookie.split(';')[0] ?? '';
      const split = pair.indexOf('=');
      const name = pair.slice(0, split);
      const value = pair.slice(split + 1);
      if (value === '') cookies.delete(name);
      else cookies.set(name, value);
    }
    client.cookie =
      cookies.size === 0
        ? undefined
        : [...cookies].map(([key, value]) => `${key}=${value}`).join('; ');
    return response;
  }

  return client;
}

/** Matchers typed as `unknown`, so they can stand for a value inside a typed object. */
export const anyString: unknown = expect.any(String);
export const matching = (pattern: RegExp): unknown => expect.stringMatching(pattern);

/** Checks the status of an answer and parses its body with the contract it must meet. */
export async function bodyOf<Schema extends z.ZodType>(
  response: Response,
  status: number,
  schema: Schema,
): Promise<z.infer<Schema>> {
  const text = await response.text();
  expect(response.status, text).toBe(status);
  return schema.parse(JSON.parse(text));
}

/** Read a private collection as the explicitly signed-in demo learner. */
export async function dashboardGet(client: TestClient, path: string): Promise<Response> {
  const signedIn = await client.post('/api/session/sign-in', {
    username: 'Rewire',
    password: 'DemoDemoDemo',
  });
  expect(signedIn.status).toBe(200);
  return client.get(path);
}
