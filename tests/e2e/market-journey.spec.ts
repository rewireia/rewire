import { expect, test } from './support/test.ts';
import { signIn } from './support/sign-in.ts';
import { checkoutFirstCourse, findThreeCourses } from './support/training.ts';
import { fundWallet } from './support/wallet.ts';
import { completePayrollJourney } from './support/work-journey.ts';

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

/** The test server's payment gateway and model are deterministic local fixtures. */
test('courses the plan found are paid from the wallet and with PayPal, and sold by the provider', async ({
  page,
  context,
}, testInfo) => {
  await context.route(/paypal\.com/, (route) => route.abort());
  await page.addInitScript(() => {
    sessionStorage.setItem('rewire.opening', '1');
    localStorage.setItem('rewire.preferences', JSON.stringify({ language: 'en', theme: 'light' }));
  });
  await page.addInitScript({ content: FAKE_PAYPAL_SDK });
  await page.goto('/');
  await page.screenshot({ path: testInfo.outputPath('home.png') });
  await page
    .getByRole('dialog', { name: 'Choose your region' })
    .getByRole('button', { name: 'United States' })
    .click();
  await page.getByRole('button', { name: /Individual/ }).click();
  await expect(page.getByRole('heading', { name: 'Rewire your skills.' })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('welcome.png') });
  await page.getByRole('link', { name: 'Start', exact: true }).click();
  await completePayrollJourney(page);
  await page.screenshot({ path: testInfo.outputPath('report.png') });
  await expect(
    page.getByRole('link', { name: 'Ask the agent for training tailored to me' }),
  ).toBeVisible();

  // Money for the courses, added through the test server's fake PayPal.
  await signIn(page);
  await fundWallet(page, 10_000);
  await page.goto('/us/plan/4313');
  await expect(page.getByText(/Your wallet has \$100 to pay for courses\./)).toBeVisible();

  // One course found by Rex, paid from the balance.
  await findThreeCourses(page);
  await page.screenshot({ path: testInfo.outputPath('plan.png') });
  await checkoutFirstCourse(page);
  await page.screenshot({ path: testInfo.outputPath('checkout.png') });
  const fromWallet = page.waitForResponse(
    (response) => response.url().endsWith('/api/wallet/payments') && response.ok(),
  );
  await page.getByRole('button', { name: /from your balance$/ }).click();
  const walletOrder = (await (await fromWallet).json()) as { orderId: string };
  await expect(page.getByRole('heading', { name: 'Your courses are ready' })).toBeVisible();

  // Another, paid with PayPal: its stand-in approves the order the server opened.
  await page.goto('/us/plan/4313');
  await findThreeCourses(page);
  await checkoutFirstCourse(page);
  const withPayPal = page.waitForResponse(
    (response) => response.url().endsWith('/api/checkout/orders') && response.ok(),
  );
  await page.getByRole('button', { name: 'PayPal', exact: true }).click();
  const paypalOrder = (await (await withPayPal).json()) as { orderId: string };
  await expect(page.getByRole('heading', { name: 'Your courses are ready' })).toBeVisible();

  const payments = (await (await page.request.get('/api/payments')).json()) as {
    payments: { orderId: string; method: string; courseTitle: string; seller: string }[];
  };
  const paid = (orderId: string) => payments.payments.find((item) => item.orderId === orderId);
  expect(paid(walletOrder.orderId)).toMatchObject({ method: 'wallet', seller: 'Sun School' });
  expect(paid(paypalOrder.orderId)).toMatchObject({ method: 'paypal', seller: 'Sun School' });
  const order = walletOrder;
  const title = paid(walletOrder.orderId)?.courseTitle ?? '';
  const wallet = (await (await page.request.get('/api/marketplace/wallet?region=us')).json()) as {
    fundedMinor: number;
    spentMinor: number;
  };
  expect(wallet.fundedMinor).toBe(10_000);
  expect(wallet.spentMinor).toBeGreaterThan(0);

  await page.goto('/dashboard');
  await expect(page.getByRole('region', { name: 'My courses' }).getByText(title)).toBeVisible();
  await page.getByRole('region', { name: 'My courses' }).last().scrollIntoViewIfNeeded();
  await page.screenshot({ path: testInfo.outputPath('dashboard.png') });
  await page.getByRole('button', { name: 'Sign out' }).click();
  await page.goto('/business');
  const business = page.getByRole('dialog', { name: 'Sign in', exact: true });
  await business.getByLabel('Username', { exact: true }).fill('Rewire');
  await business.getByLabel('Password', { exact: true }).fill('DemoDemoDemo');
  await business.getByRole('button', { name: 'Sign in', exact: true }).click();
  // One demonstration seller sells every course; each keeps the provider that wrote it.
  await expect(page.getByText('Sun School · demonstration seller · PayPal Sandbox')).toBeVisible();
  const summary = page.getByRole('region', { name: 'Seller summary' });
  await expect(summary.getByText('Courses sold')).toBeVisible();
  await page.getByRole('button', { name: 'My courses', exact: true }).click();
  await page.getByRole('region', { name: 'Course catalogue' }).waitFor();
  await page.screenshot({ path: testInfo.outputPath('business-catalogue.png') });
  await page.getByRole('button', { name: 'Sales', exact: true }).click();
  // Identify the same order in both roles, not only a matching course title.
  const sales = page.getByRole('region', { name: 'Sales' });
  const sale = sales.locator(`[row-id="${order.orderId}"]`);
  await expect(sale.getByRole('gridcell', { name: title, exact: true })).toBeVisible();
  await expect(sale.getByRole('gridcell', { name: 'Paid', exact: true })).toBeVisible();
  await expect(sale.getByRole('gridcell', { name: 'Wallet balance', exact: true })).toBeVisible();
  const card = sales.locator(`[row-id="${paypalOrder.orderId}"]`);
  await expect(card.getByRole('gridcell', { name: 'PayPal', exact: true })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('business.png') });
});
