import { expect, type Page } from '@playwright/test';

const WAIT = 90_000;

export async function signIn(page: Page, role: 'learner' | 'business'): Promise<void> {
  const response = await page.request.post('/api/session/sign-in', {
    data: { username: 'Rewire', password: 'DemoDemoDemo', role },
  });
  expect(response.ok()).toBe(true);
}

/** Stops on login challenges or unexpected screens; it never attempts to bypass them. */
export async function approve(window: Page): Promise<void> {
  try {
    const email = window.locator('#email');
    const approval = window
      .locator('[data-testid="submit-button-initial"], #payment-submit-btn')
      .first();
    await Promise.race([
      email.waitFor({ state: 'visible', timeout: WAIT }),
      approval.waitFor({ state: 'visible', timeout: WAIT }),
    ]);
    if (await email.isVisible()) {
      await email.fill(process.env['PAYPAL_SANDBOX_BUYER_EMAIL'] ?? '');
      const next = window.locator('#btnNext');
      if (await next.isVisible()) await next.click();
      await window
        .locator('#password')
        .fill(process.env['PAYPAL_SANDBOX_BUYER_PASSWORD'] ?? '', { timeout: WAIT });
      await window.locator('#btnLogin').click();
    }
    await window
      .locator('[data-testid="submit-button-initial"], #payment-submit-btn')
      .first()
      .click({ timeout: WAIT });
  } catch {
    // Playwright's locator diagnostics can contain typed credentials; do not print them.
    throw new Error('PayPal sign-in or approval did not complete; inspect the sandbox manually.');
  }
}
