import { expect, test } from './support/test.ts';

import { signIn } from './support/sign-in.ts';

test.use({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });

/**
 * A stand-in for PayPal's script, defined before the page loads it: its button starts a session
 * that approves at once what the server opened. The capture still goes to the test server, whose
 * gateway is the fake one: nothing here is a PayPal transaction.
 */
const FAKE_PAYPAL_SDK = `
  const session = (options) => ({
    start: async (_presentation, order) => {
      const { orderId } = await order;
      await options.onApprove({ orderId });
    },
  });
  const instance = {
    findEligibleMethods: async () => ({
      isEligible: (method) => method === 'paypal',
      getDetails: () => null,
    }),
    createPayPalOneTimePaymentSession: session,
    createPayLaterOneTimePaymentSession: session,
  };
  window.paypal = { version: '6.0.0-test', createInstance: async () => instance };
  customElements.define('paypal-button', class extends HTMLElement {
    connectedCallback() {
      if (this.shadowRoot !== null) return;
      const button = document.createElement('button');
      button.textContent = 'PayPal';
      this.attachShadow({ mode: 'open' }).append(button);
    }
  });
`;

test('money added with PayPal shows in the wallet and pays for a course', async ({ page }) => {
  await page.context().route(/paypal\.com/, (route) => route.abort());
  await page.addInitScript(() => {
    sessionStorage.setItem('rewire.opening', '1');
    localStorage.setItem(
      'rewire.preferences',
      JSON.stringify({ language: 'en', theme: 'light', region: 'us', regionChosen: true }),
    );
  });
  await page.addInitScript({ content: FAKE_PAYPAL_SDK });
  await signIn(page);
  await page.goto('/dashboard?tab=wallet');

  const wallet = page.getByRole('region', { name: 'Your wallet' });
  await expect(wallet.getByText('PayPal Sandbox: no real money moves.')).toBeVisible();
  await expect(wallet.getByText('No movements yet.', { exact: false })).toBeVisible();

  // The server opens the top-up with the amount chosen; PayPal's stand-in approves it.
  await wallet.getByRole('radio', { name: '$100' }).check({ force: true });
  const opened = page.waitForResponse(
    (response) => response.url().endsWith('/api/wallet/top-ups') && response.ok(),
  );
  await wallet.getByRole('button', { name: 'PayPal', exact: true }).click();
  expect((await opened).request().postDataJSON()).toEqual({ region: 'us', amountMinor: 10_000 });
  await expect(wallet.getByText('Money received. It is in your wallet.')).toBeVisible();
  await expect(wallet.getByText('$100 added to your wallet.')).toBeVisible();
  const movements = page.getByRole('region', { name: 'Movements' });
  await expect(movements.getByText('Added with PayPal')).toBeVisible();
  await expect(movements.getByText('+$100')).toBeVisible();

  // The balance pays for a course in one step, and the movement appears.
  const paid = await page.request.post('/api/wallet/payments', {
    data: { region: 'us', courseIds: ['ai-foundations'] },
  });
  expect(paid.status()).toBe(201);
  await page.reload();
  await expect(movements.getByText('Paid from balance')).toBeVisible();

  // An amount outside the limits offers no PayPal button.
  await wallet.getByRole('radio', { name: 'Other' }).check({ force: true });
  await wallet.getByLabel('Other amount in USD').fill('2');
  await expect(wallet.getByText('From $5 to $500.')).toBeVisible();
  await expect(wallet.getByRole('button', { name: 'PayPal', exact: true })).toHaveCount(0);
});
