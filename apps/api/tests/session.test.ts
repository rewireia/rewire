import { sessionSchema } from '@rewire/contracts';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { bodyOf } from './support/client.ts';
import { createTestApi, expectProblem, type TestApi } from './support/test-api.ts';

const PROFILE = {
  region: 'us',
  occupation: { code: '43-3051.00', title: 'Payroll clerk', isco08: '4313' },
  timeByTask: { '4313-1': 'most' },
};

let api: TestApi;

beforeAll(async () => {
  api = await createTestApi();
});

afterAll(async () => {
  await api.close();
});

describe('the session', () => {
  it('is a visitor without a cookie, and reading leaves no cookie', async () => {
    const visitor = api.client();
    const session = await bodyOf(await visitor.get('/api/session'), 200, sessionSchema);
    expect(session).toEqual({
      signedIn: false,
      authenticated: false,
      accessRole: null,
      profile: null,
      certificateName: null,
    });
    expect(visitor.cookie).toBeUndefined();
  });

  it('starts when the learner saves a profile, and keeps it', async () => {
    const learner = api.client();
    const saved = await bodyOf(
      await learner.put('/api/session/profile', PROFILE),
      200,
      sessionSchema,
    );
    expect(saved).toEqual({
      signedIn: true,
      authenticated: false,
      accessRole: null,
      profile: PROFILE,
      certificateName: null,
    });
    expect(learner.cookie).toMatch(/^rewire_session=/);
    expect(await bodyOf(await learner.get('/api/session'), 200, sessionSchema)).toEqual(saved);
  });

  it('starts when the browser asks for one, holding nothing, and keeps the same one', async () => {
    const browser = api.client();
    const started = await bodyOf(await browser.post('/api/session'), 200, sessionSchema);
    expect(started).toEqual({
      signedIn: true,
      authenticated: false,
      accessRole: null,
      profile: null,
      certificateName: null,
    });
    const cookie = browser.cookie;
    expect(cookie).toMatch(/^rewire_session=/);
    await bodyOf(await browser.post('/api/session'), 200, sessionSchema);
    expect(browser.cookie).toBe(cookie);
  });

  it('reads a cookie with a broken signature as no session', async () => {
    const learner = api.client();
    await learner.put('/api/session/profile', PROFILE);
    learner.cookie = `${learner.cookie ?? ''}x`;
    const session = await bodyOf(await learner.get('/api/session'), 200, sessionSchema);
    expect(session.signedIn).toBe(false);
  });

  it('refuses an occupation without a score, or a task it does not have', async () => {
    const learner = api.client();
    await expectProblem(
      await learner.put('/api/session/profile', {
        ...PROFILE,
        occupation: { ...PROFILE.occupation, isco08: '0000' },
        timeByTask: {},
      }),
      400,
      'invalid_input',
    );
    await expectProblem(
      await learner.put('/api/session/profile', { ...PROFILE, timeByTask: { '2512-1': 'most' } }),
      400,
      'invalid_input',
    );
    expect(learner.cookie).toBeUndefined();
  });

  it('refuses an occupation the classification of the region does not have', async () => {
    const learner = api.client();
    const problem = await expectProblem(
      await learner.put('/api/session/profile', {
        ...PROFILE,
        occupation: { ...PROFILE.occupation, code: '99-9999.99' },
        timeByTask: {},
      }),
      400,
      'invalid_input',
    );
    expect(problem.issues?.map((issue) => issue.path)).toEqual(['occupation.code']);
    // A US code means nothing in the classification of the UK.
    await expectProblem(
      await learner.put('/api/session/profile', { ...PROFILE, region: 'uk', timeByTask: {} }),
      400,
      'invalid_input',
    );
    expect(learner.cookie).toBeUndefined();
  });

  it('refuses a unit group the occupation cannot be read through', async () => {
    const problem = await expectProblem(
      await api.client().put('/api/session/profile', {
        ...PROFILE,
        occupation: { ...PROFILE.occupation, isco08: '2512' },
        timeByTask: {},
      }),
      400,
      'invalid_input',
    );
    expect(problem.issues?.map((issue) => issue.path)).toEqual(['occupation.isco08']);
  });

  it('accepts any of the groups the occupation is linked to', async () => {
    const saved = await bodyOf(
      await api.client().put('/api/session/profile', {
        ...PROFILE,
        occupation: { ...PROFILE.occupation, isco08: '4416' },
        timeByTask: {},
      }),
      200,
      sessionSchema,
    );
    expect(saved.profile?.occupation.isco08).toBe('4416');
  });
});
