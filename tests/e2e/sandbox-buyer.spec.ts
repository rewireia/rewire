import { expect, test, type Page } from './support/test.ts';

import { signIn } from './support/sign-in.ts';

const buyer = { email: 'buyer@personal.example.com', password: 'fictional-password' };
const CONFIG = '**/api/regions/us/payment-config';

/** The payment configuration the server would give, for every tab of the browser. */
async function serveConfig(page: Page, environment: 'sandbox' | 'live', includeBuyer: boolean) {
  await page.context().unroute(CONFIG);
  await page.context().route(CONFIG, (route) =>
    route.fulfill({
      json: {
        available: true,
        environment,
        clientId: 'fictional-client',
        currency: 'USD',
        ...(includeBuyer ? { sandboxBuyer: buyer } : {}),
      },
    }),
  );
}

async function openCheckout(page: Page, environment: 'sandbox' | 'live', includeBuyer: boolean) {
  await serveConfig(page, environment, includeBuyer);
  // No SDK or PayPal connection is needed to see the instructions.
  await page.context().route(/paypal\.com/, (route) => route.abort());
  await signIn(page);
  await page.goto('/us/courses/ai-foundations');
}

test('sandbox instructions expose the configured buyer and allow copy or manual selection', async ({
  page,
}) => {
  await openCheckout(page, 'sandbox', true);
  const pay = page.getByRole('region', { name: 'Pay with PayPal' });
  await expect(pay.getByText('Test purchase. No real money moves.')).toBeVisible();
  const credentials = pay.getByRole('link', { name: /Open test credentials/ });
  await expect(credentials).toHaveAttribute('href', '/us/sandbox-access');
  await expect(credentials).toHaveAttribute('target', '_blank');

  // The credentials open in a tab of their own, which stays usable while PayPal covers checkout.
  const [tab] = await Promise.all([page.waitForEvent('popup'), credentials.click()]);
  await expect(tab).toHaveURL(/\/us\/sandbox-access$/);
  await expect(tab.getByRole('heading', { name: 'Your PayPal test login' })).toBeVisible();
  await expect(tab.getByRole('heading', { name: 'Test this purchase' })).toBeVisible();
  const email = tab.getByLabel('PayPal sandbox email', { exact: true });
  await expect(email).toHaveValue(buyer.email);
  await expect(tab.getByLabel('PayPal sandbox password', { exact: true })).toHaveValue(
    buyer.password,
  );
  await tab.evaluate(() => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: () => Promise.resolve() },
    });
  });
  await tab.getByRole('button', { name: 'Copy PayPal sandbox email' }).click();
  await expect(tab.getByRole('status').filter({ hasText: 'Copied to clipboard.' })).toBeVisible();
  await tab.evaluate(() => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: () => Promise.reject(new Error('unavailable')) },
    });
  });
  await tab.getByRole('button', { name: 'Copy PayPal sandbox password' }).click();
  await expect(
    tab.getByRole('status').filter({ hasText: 'Select and copy the value manually.' }),
  ).toBeVisible();
  await expect(tab.getByLabel('PayPal sandbox password', { exact: true })).toBeFocused();
});

test('sandbox without buyer details gives guidance and live never displays supplied details', async ({
  page,
}) => {
  await openCheckout(page, 'sandbox', false);
  const pay = page.getByRole('region', { name: 'Pay with PayPal' });
  await expect(pay.getByText('Test purchase. No real money moves.')).toBeVisible();
  await expect(pay.getByRole('link', { name: /Open test credentials/ })).toHaveCount(0);
  await page.goto('/us/sandbox-access');
  await expect(
    page.getByText('To complete this test you need a PayPal Sandbox buyer account.'),
  ).toBeVisible();
  await expect(page.getByLabel('PayPal sandbox email', { exact: true })).toHaveCount(0);

  // Live payments never show sandbox details, even if the server were to send them.
  await serveConfig(page, 'live', true);
  await page.goto('/us/courses/ai-foundations');
  await expect(page.getByRole('heading', { name: 'Pay with PayPal' })).toBeVisible();
  await expect(page.getByText('Test purchase. No real money moves.')).toHaveCount(0);
  await expect(page.getByRole('link', { name: /Open test credentials/ })).toHaveCount(0);
  await page.goto('/us/sandbox-access');
  await expect(
    page.getByText('Test credentials are not available for this payment environment.'),
  ).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Test this purchase' })).toHaveCount(0);
  await expect(page.getByLabel('PayPal sandbox email', { exact: true })).toHaveCount(0);
});
