import { problemSchema, sessionSchema } from '@rewire/contracts';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { anyString, bodyOf } from './support/client.ts';
import { createTestApi, expectProblem, type TestApi } from './support/test-api.ts';

const PUBLIC_ORIGIN = 'http://127.0.0.1:5200';
const PROFILE = {
  region: 'us',
  occupation: { code: '43-3051.00', title: 'Payroll clerk', isco08: '4313' },
  timeByTask: {},
};

let api: TestApi;

beforeAll(async () => {
  api = await createTestApi();
});

afterAll(async () => {
  await api.close();
});

describe('every answer', () => {
  it('carries a request id, also in the body of an error', async () => {
    const response = await api.app.request('/api/no-such-route');
    const requestId = response.headers.get('X-Request-Id');
    expect(requestId).toMatch(/^[0-9a-f-]{36}$/);
    expect(response.headers.get('Content-Type')).toContain('application/problem+json');
    const problem = await bodyOf(response, 404, problemSchema);
    expect(problem).toMatchObject({ code: 'not_found', requestId });
  });

  it('turns a body that is too large into a 413 problem', async () => {
    const response = await api.app.request('/api/session/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ padding: 'x'.repeat(70 * 1024) }),
    });
    await expectProblem(response, 413, 'too_large');
  });

  it('names each field at fault in invalid input', async () => {
    const problem = await expectProblem(
      await api.client().put('/api/session/profile', { ...PROFILE, region: 'mars' }),
      400,
      'invalid_input',
    );
    expect(problem.issues).toEqual([{ path: 'region', message: anyString }]);
  });
});

describe('same origin', () => {
  it('refuses a write sent from another site', async () => {
    const response = await api
      .client()
      .put('/api/session/profile', PROFILE, { Origin: 'https://evil.example' });
    await expectProblem(response, 403, 'cross_origin');
  });

  it('lets a write from the web through, and one without Origin', async () => {
    const fromWeb = await api
      .client()
      .put('/api/session/profile', PROFILE, { Origin: PUBLIC_ORIGIN });
    await bodyOf(fromWeb, 200, sessionSchema);
    await bodyOf(await api.client().put('/api/session/profile', PROFILE), 200, sessionSchema);
  });

  it('lets reads through from anywhere', async () => {
    const response = await api.client().get('/api/health', { Origin: 'https://evil.example' });
    expect(response.status).toBe(200);
  });

  it('leaves the webhook to prove itself with its signature', async () => {
    const response = await api.app.request('/api/webhooks/paypal', {
      method: 'POST',
      headers: { Origin: 'https://evil.example' },
      body: '{}',
    });
    await expectProblem(response, 401, 'invalid_signature');
  });
});

describe('a body that is not JSON', () => {
  const ROUTES = [
    ['PUT', '/api/session/profile'],
    ['POST', '/api/checkout/orders'],
    ['POST', '/api/sponsorships'],
    ['POST', '/api/unit-groups/4313/personal-exposure'],
    ['POST', '/api/learning/courses/ai-foundations/quiz'],
    ['POST', '/api/learning/courses/ai-foundations/certificate'],
    ['POST', '/api/regions/us/occupations/interpret'],
    ['POST', '/api/unit-groups/4313/explanation'],
    ['POST', '/api/guide/messages'],
  ] as const;

  it.each(ROUTES)('is a 400 invalid_json at %s %s', async (method, path) => {
    const learner = api.client();
    // The learning routes need a session before they read the body.
    await bodyOf(await learner.put('/api/session/profile', PROFILE), 200, sessionSchema);
    const response = await api.app.request(path, {
      method,
      headers: { 'Content-Type': 'application/json', Cookie: learner.cookie ?? '' },
      body: '{"not": json',
    });
    await expectProblem(response, 400, 'invalid_json');
  });
});

describe('a region that does not exist', () => {
  const ROUTES = [
    ['GET', '/api/regions/mars/occupations?q=payroll'],
    ['GET', '/api/regions/mars/occupations/43-3051.00'],
    ['GET', '/api/regions/mars/labour?code=43-3051.00'],
    ['GET', '/api/regions/mars/pathway?isco08=4313'],
    ['GET', '/api/regions/mars/courses'],
    ['GET', '/api/regions/mars/courses/ai-foundations'],
    ['GET', '/api/regions/mars/payment-config'],
    ['POST', '/api/regions/mars/occupations/interpret'],
  ] as const;

  it.each(ROUTES)('is a 404 at %s %s', async (method, path) => {
    const response = await api.app.request(path, {
      method,
      headers: { 'Content-Type': 'application/json' },
      ...(method === 'POST' ? { body: JSON.stringify({ text: 'payroll clerk' }) } : {}),
    });
    const problem = await expectProblem(response, 404, 'not_found');
    expect(problem.detail).toBe('That region does not exist.');
  });
});
