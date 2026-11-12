import { sessionSchema } from '@rewire/contracts';
import { setSignedCookie } from 'hono/cookie';
import { Hono } from 'hono';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { bodyOf } from './support/client.ts';
import { createTestApi, expectProblem, type TestApi } from './support/test-api.ts';

let api: TestApi;
beforeEach(async () => {
  api = await createTestApi();
});
afterEach(async () => {
  await api.close();
});
const PROFILE = {
  region: 'us',
  occupation: { code: '43-3051.00', title: 'Payroll clerk', isco08: '4313' },
  timeByTask: {},
};
const DEMO = { username: 'Rewire', password: 'DemoDemoDemo' };
const COLLECTIONS = ['/api/learning', '/api/payments', '/api/sponsorships'];

describe('explicit dashboard access', () => {
  it('does not mistake a saved occupation for a login', async () => {
    const browser = api.client();
    await browser.put('/api/session/profile', PROFILE);
    const session = await bodyOf(await browser.get('/api/session'), 200, sessionSchema);
    expect(session.authenticated).toBe(false);
    for (const path of COLLECTIONS)
      await expectProblem(await browser.get(path), 401, 'sign_in_required');
  });
  it('refuses bad credentials without creating a learner', async () => {
    const browser = api.client();
    await expectProblem(
      await browser.post('/api/session/sign-in', { ...DEMO, password: 'wrong' }),
      401,
      'invalid_credentials',
    );
    expect(browser.cookie).toBeUndefined();
  });
  it.each(['learner', 'business'] as const)(
    'rejects old credentials and password case changes for %s',
    async (role) => {
      const browser = api.client();
      for (const credentials of [
        { username: 'Demo', password: 'Demo' },
        { username: 'Rewire', password: 'demodemodemo' },
      ]) {
        await expectProblem(
          await browser.post('/api/session/sign-in', { ...credentials, role }),
          401,
          'invalid_credentials',
        );
        expect(browser.cookie).toBeUndefined();
      }
    },
  );
  it('adopts the learner on login and hides the shared profile on logout', async () => {
    const browser = api.client();
    await browser.put('/api/session/profile', PROFILE);
    const original = browser.cookie;
    const response = await browser.post('/api/session/sign-in', DEMO);
    expect(response.status).toBe(200);
    expect(response.headers.getSetCookie().join(';')).toContain('HttpOnly');
    expect(browser.cookie).toContain(original);
    expect((await bodyOf(await browser.get('/api/session'), 200, sessionSchema)).accessRole).toBe(
      'learner',
    );
    for (const path of COLLECTIONS) expect((await browser.get(path)).status).toBe(200);
    await browser.post('/api/session/sign-out');
    const session = await bodyOf(await browser.get('/api/session'), 200, sessionSchema);
    expect(session.authenticated).toBe(false);
    expect(session.profile).toBeNull();
    for (const path of COLLECTIONS)
      await expectProblem(await browser.get(path), 401, 'sign_in_required');
  });
  it('shares the learner profile between signed-in demo browsers', async () => {
    const first = api.client();
    const second = api.client();
    await first.post('/api/session/sign-in', DEMO);
    await first.put('/api/session/profile', PROFILE);
    expect((await bodyOf(await second.get('/api/session'), 200, sessionSchema)).profile).toBeNull();
    await second.post('/api/session/sign-in', DEMO);
    expect((await bodyOf(await second.get('/api/session'), 200, sessionSchema)).profile).toEqual(
      PROFILE,
    );
    await second.post('/api/session/sign-out');
    expect((await bodyOf(await second.get('/api/session'), 200, sessionSchema)).profile).toBeNull();
    await expectProblem(await second.get('/api/payments'), 401, 'sign_in_required');
  });
  it('binds the access grant to its role', async () => {
    const business = api.client();
    await business.post('/api/session/sign-in', { ...DEMO, username: 'rEwIrE', role: 'business' });
    expect((await bodyOf(await business.get('/api/session'), 200, sessionSchema)).accessRole).toBe(
      'business',
    );
    await expectProblem(await business.get('/api/payments'), 401, 'sign_in_required');
    await business.post('/api/session/sign-in', { username: 'rEwIrE', password: 'DemoDemoDemo' });
    expect((await business.get('/api/payments')).status).toBe(200);
  });
  it('rejects expired grants even if the browser still sends the cookie', async () => {
    const browser = api.client();
    await browser.post('/api/session/sign-in', DEMO);
    const learner = await api.database.execute(
      "SELECT learner_id AS id FROM demo_identity WHERE name = 'learner'",
    );
    const signer = new Hono().get('/', async (context) => {
      await setSignedCookie(
        context,
        'rewire_access',
        JSON.stringify({
          learnerId: learner.rows[0]?.['id'],
          role: 'learner',
          expiresAt: Date.now() - 1,
        }),
        'a-session-secret-for-tests-only-0123456789',
      );
      return context.text('');
    });
    const expired = (await signer.request('/')).headers.getSetCookie()[0]?.split(';')[0];
    browser.cookie = browser.cookie
      ?.split('; ')
      .filter((cookie) => !cookie.startsWith('rewire_access='))
      .concat(expired ?? '')
      .join('; ');
    await expectProblem(await browser.get('/api/learning'), 401, 'sign_in_required');
  });
});
