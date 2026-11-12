import { expect, test, type Page } from '@playwright/test';

import { approve, signIn } from './paypal-support.ts';

const WEB_ORIGIN = 'http://127.0.0.1:5295';
const WAIT = 90_000;
const TOP_UP_MINOR = 2500;
const COURSE = 'ai-foundations';
const ENABLED = process.env['PAYPAL_SANDBOX_WALLET_LIVE'] === '1';
const REQUIRED = [
  'PAYPAL_CLIENT_ID',
  'PAYPAL_CLIENT_SECRET',
  'PAYPAL_SANDBOX_BUYER_EMAIL',
  'PAYPAL_SANDBOX_BUYER_PASSWORD',
] as const;
const missing = REQUIRED.filter((name) => (process.env[name] ?? '') === '');

interface Wallet {
  readonly fundedMinor: number;
  readonly spentMinor: number;
  readonly availableMinor: number;
}
interface Payment {
  readonly courseId: string;
  readonly method: string;
  readonly status: string;
  readonly amount: { readonly minorUnits: number };
}

async function walletOf(page: Page): Promise<Wallet> {
  const response = await page.request.get('/api/marketplace/wallet?region=us');
  expect(response.ok()).toBe(true);
  return (await response.json()) as Wallet;
}

async function paymentsOf(page: Page): Promise<readonly Payment[]> {
  const response = await page.request.get('/api/payments');
  expect(response.ok()).toBe(true);
  return ((await response.json()) as { payments: Payment[] }).payments;
}

/** Opens the page of test credentials, which is what makes PayPal's buttons available. */
async function prepareSandboxBuyer(page: Page): Promise<void> {
  const link = page.getByRole('link', { name: /Open test credentials/ }).first();
  if (!(await link.isVisible())) {
    return;
  }
  const opened = page.waitForEvent('popup', { timeout: WAIT });
  await link.click();
  await (await opened).close();
}

test.skip(!ENABLED, 'Set PAYPAL_SANDBOX_WALLET_LIVE=1 to add sandbox money to the wallet.');
test.skip(missing.length > 0, `Missing in .env: ${missing.join(', ')}`);

test('sandbox money added with PayPal reaches the wallet and pays for a course', async ({
  page,
}) => {
  await page.addInitScript(() => {
    sessionStorage.setItem('rewire.opening', '1');
    localStorage.setItem(
      'rewire.preferences',
      JSON.stringify({ language: 'en', theme: 'dark', region: 'us', regionChosen: true }),
    );
  });
  await signIn(page, 'learner');
  expect((await walletOf(page)).fundedMinor).toBe(0);

  // The top-up: PayPal's own window, approved by the sandbox buyer, captured by the server.
  await page.goto('/dashboard?tab=wallet');
  const wallet = page.getByRole('region', { name: 'Your wallet' });
  await wallet.getByRole('radio', { name: '$25' }).check({ force: true });
  await prepareSandboxBuyer(page);
  const button = page.locator('paypal-button').first();
  await expect(button).toBeVisible({ timeout: WAIT });
  const opened = page.waitForEvent('popup', { timeout: WAIT });
  await button.click();
  await approve(await opened);
  await expect
    .poll(async () => (await walletOf(page)).fundedMinor, { timeout: WAIT })
    .toBe(TOP_UP_MINOR);

  // The balance pays for a course at the price the server sets, and the wallet says so.
  const paid = await page.request.post('/api/wallet/payments', {
    headers: { Origin: WEB_ORIGIN },
    data: { region: 'us', courseIds: [COURSE] },
  });
  expect(paid.status()).toBe(201);
  const payment = (await paymentsOf(page)).find((line) => line.courseId === COURSE);
  expect(payment).toMatchObject({ method: 'wallet', status: 'completed' });
  const after = await walletOf(page);
  expect(after.spentMinor).toBe(payment?.amount.minorUnits);
  expect(after.availableMinor).toBe(TOP_UP_MINOR - after.spentMinor);
});
