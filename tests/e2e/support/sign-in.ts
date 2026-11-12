import { expect, type Page } from '@playwright/test';

/** Authenticate the isolated browser session using the public demo credentials. */
export async function signIn(page: Page): Promise<void> {
  const response = await page.request.post('/api/session/sign-in', {
    data: { username: 'Rewire', password: 'DemoDemoDemo', role: 'learner' },
  });
  expect(response.ok()).toBe(true);
}
