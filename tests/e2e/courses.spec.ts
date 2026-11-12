import { expect, test, type Page } from './support/test.ts';

import { signIn } from './support/sign-in.ts';

test.use({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });

/**
 * A stand-in for PayPal's script, defined before the page loads it: its button starts a session
 * that approves the order the server opened at once. The capture still goes to the test server,
 * whose gateway is the fake one: nothing here is a PayPal transaction. It runs in the page, so it
 * is given as the page's own script.
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

async function openShop(page: Page) {
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
  await page.goto('/courses');
  await expect(page.getByRole('heading', { name: 'Find your next course' })).toBeVisible();
  await expect(page.getByText(/payment uses PayPal Sandbox and moves no real money/)).toBeVisible();
}

test('Rex proposes courses, two go to the cart, one PayPal order enrols in both', async ({
  page,
}) => {
  await openShop(page);

  // Rex answers in a sentence the page writes from the server's answer.
  const rex = page.getByRole('region', { name: 'Rex' });
  await rex.getByLabel('What would you like to learn?').fill('I want to use AI with spreadsheets');
  await rex.getByRole('button', { name: 'Ask Rex' }).click();
  await expect(rex.getByText('I want to use AI with spreadsheets')).toBeVisible();
  await expect(
    rex
      .getByText(/fits? what you are looking for|found no course that fits|could not search/)
      .first(),
  ).toBeVisible();

  // The catalogue, filtered in the browser.
  const browse = page.getByRole('region', { name: 'Browse the catalogue' });
  const count = browse.getByText(/^Showing [\d,]+ of [\d,]+ courses$/);
  const before = await count.textContent();
  await browse.getByLabel('Level').selectOption('introductory');
  await expect(count).not.toHaveText(before ?? '');
  await expect(browse.getByRole('button', { name: 'Clear filters' })).toBeVisible();

  // Two courses into the cart: the header counts them.
  const titles = browse.getByRole('article').getByRole('heading', { level: 3 });
  const first = (await titles.nth(0).textContent()) ?? '';
  const second = (await titles.nth(1).textContent()) ?? '';
  await browse.getByRole('button', { name: 'Add to cart' }).first().click();
  await expect(browse.getByRole('link', { name: 'In the cart ✓' })).toHaveCount(1);
  await browse.getByRole('button', { name: 'Add to cart' }).first().click();
  await page.getByRole('link', { name: 'Cart, 2 courses' }).click();

  await expect(page).toHaveURL(/\/cart$/);
  const lines = page.getByRole('region', { name: /Your courses/ });
  await expect(lines.getByRole('heading', { name: first, exact: true })).toBeVisible();
  await expect(lines.getByRole('heading', { name: second, exact: true })).toBeVisible();
  await expect(
    page.getByText('PayPal Sandbox: a test payment in which no real money moves.'),
  ).toBeVisible();

  // One order for both, opened by the server with its own amount.
  const opened = page.waitForResponse(
    (response) => response.url().endsWith('/api/checkout/orders') && response.ok(),
  );
  await page.getByRole('button', { name: 'PayPal', exact: true }).click();
  const order = (await opened).request().postDataJSON() as { courseIds: string[] };
  expect(order.courseIds).toHaveLength(2);

  // With reduced motion, the enrolment shows its result at once.
  await expect(page.getByRole('heading', { name: 'You are enrolled', level: 2 })).toBeVisible();
  const enrolled = page.getByRole('region', { name: 'You are enrolled' });
  await expect(enrolled.getByRole('listitem')).toHaveCount(2);
  await expect(page.getByRole('link', { name: 'Cart, empty' })).toBeVisible();

  await enrolled.getByRole('link', { name: 'See it in your dashboard' }).first().click();
  await expect(page).toHaveURL(/\/dashboard\?tab=roadmap$/);
  await page.goto('/dashboard');
  await expect(
    page.getByRole('region', { name: 'My courses' }).getByText(first).first(),
  ).toBeVisible();
});
