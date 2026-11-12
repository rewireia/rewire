import type { Session, StudioTurnRequest } from '@rewire/contracts';
import { describe, expect, it, vi } from 'vitest';

import { createApiClient } from '../src/api/client.ts';

const SESSION: Session = {
  signedIn: true,
  authenticated: false,
  accessRole: null,
  profile: null,
  certificateName: null,
};
const BUSY = { status: 429, code: 'analyst_busy', title: 'The analyst is busy' };
/** The server refuses these turns before reading them, so their content does not matter here. */
const TURN = {} as StudioTurnRequest;

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function addressOf(input: RequestInfo | URL): string {
  if (typeof input === 'string') {
    return input;
  }
  return input instanceof URL ? input.href : input.url;
}

/** A server whose analyst is busy, and whose sessions open or not as told. */
function serverWith(sessionAnswers: readonly number[]) {
  const answers = [...sessionAnswers];
  const fetchFn = vi.fn<typeof fetch>((input) => {
    if (addressOf(input).endsWith('/session')) {
      const status = answers.shift() ?? 200;
      return Promise.resolve(json(status, status === 200 ? SESSION : { ...BUSY, status }));
    }
    return Promise.resolve(json(429, BUSY));
  });
  const paths = () => fetchFn.mock.calls.map(([input]) => addressOf(input));
  return { api: createApiClient(fetchFn, '/api'), paths };
}

describe('the analyst and its session', () => {
  it('opens a session before the first turn, and only once', async () => {
    const { api, paths } = serverWith([200]);
    await expect(api.studioTurn(TURN)).rejects.toMatchObject({ problem: { code: 'analyst_busy' } });
    await expect(api.studioTurn(TURN)).rejects.toMatchObject({ problem: { code: 'analyst_busy' } });
    expect(paths()).toEqual(['/api/session', '/api/studio/turn', '/api/studio/turn']);
  });

  it('sends no turn while the session cannot be opened, and asks for it again', async () => {
    const { api, paths } = serverWith([500, 200]);
    await expect(api.studioTurn(TURN)).rejects.toBeDefined();
    expect(paths()).toEqual(['/api/session']);

    await expect(api.studioTurn(TURN)).rejects.toMatchObject({ problem: { code: 'analyst_busy' } });
    expect(paths()).toEqual(['/api/session', '/api/session', '/api/studio/turn']);
  });
});
