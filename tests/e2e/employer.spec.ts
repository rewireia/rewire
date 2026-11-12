import { expect, test, type Page } from './support/test.ts';

import { signIn } from './support/sign-in.ts';

const COURSE = 'ai-foundations';
/** The test server itself: its `/test/` routes are not behind the web's `/api` proxy. */
const TEST_SERVER = 'http://127.0.0.1:8290';

test.beforeEach(async ({ context, page }) => {
  await context.route(/paypal\.com/, (route) => route.abort());
  await signIn(page);
});

/** Starts a session with a confirmed occupation and asks the employer to pay for the course. */
async function askEmployer(page: Page): Promise<void> {
  await page.request.put('/api/session/profile', {
    data: {
      region: 'us',
      occupation: { code: '43-3051.00', title: 'Payroll Clerk', isco08: '4313' },
      timeByTask: {},
    },
  });
  await page.goto(`/us/courses/${COURSE}`);
  await page.getByRole('textbox', { name: 'Your employer’s email' }).fill('payroll@example.com');
  await page.getByRole('button', { name: 'Send the invoice' }).click();
  await expect(page.getByText(/Invoice \S+ is on its way to your employer/)).toBeVisible();
  await expect(page.getByText('Status: Sent, not paid yet')).toBeVisible();
}

test('an invoice the employer pays opens the course from the dashboard', async ({ page }) => {
  await askEmployer(page);
  const list = (await (await page.request.get('/api/sponsorships')).json()) as {
    sponsorships: { payUrl: string }[];
  };
  const invoiceId = list.sponsorships[0]?.payUrl.split('#').pop() ?? '';
  const paid = await page.request.post(`${TEST_SERVER}/test/invoices/${invoiceId}/pay`);
  expect(paid.status()).toBe(204);

  await page.goto('/dashboard');
  await page.getByRole('link', { name: 'Payments', exact: true }).click();
  const requests = page.getByRole('region', { name: 'Requests to my employer' });
  await requests.getByRole('button', { name: 'Check again' }).click();
  await expect(requests.getByText('Paid', { exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Overview', exact: true }).click();
  const courses = page.getByRole('region', { name: 'My courses' });
  await expect(courses.getByText(/AI foundations/)).toBeVisible();
});

test('a request cancelled from the dashboard stays cancelled', async ({ page }) => {
  await askEmployer(page);
  await page.goto('/dashboard');
  await page.getByRole('link', { name: 'Payments', exact: true }).click();
  const requests = page.getByRole('region', { name: 'Requests to my employer' });
  await requests.getByRole('button', { name: 'Cancel request' }).click();
  const dialog = page.getByRole('dialog', { name: 'Cancel this request?' });
  await expect(dialog).toContainText('cancelled at PayPal');
  await dialog.getByRole('button', { name: 'Cancel the request' }).click();

  await expect(requests.getByText('Cancelled', { exact: true })).toBeVisible();
  await expect(requests.getByRole('button', { name: 'Cancel request' })).toHaveCount(0);
});

test('the keyboard reaches every action of a request still out', async ({ page }) => {
  await askEmployer(page);
  await page.goto('/dashboard');
  await page.getByRole('link', { name: 'Payments', exact: true }).click();
  const requests = page.getByRole('region', { name: 'Requests to my employer' }).last();
  const actions = requests.getByRole('gridcell').filter({
    has: page.getByRole('button', { name: 'Check again' }),
  });

  // Enter on the cell takes the focus to its first action; Tab goes through the others.
  await actions.focus();
  await page.keyboard.press('Enter');
  await expect(requests.getByRole('button', { name: 'Check again' })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(requests.getByRole('link', { name: 'Payment page' })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(requests.getByRole('button', { name: 'Cancel request' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog', { name: 'Cancel this request?' })).toBeVisible();
});

test('a request waiting on a check keeps its buttons waiting', async ({ page }) => {
  await askEmployer(page);
  let release = (): void => undefined;
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route(/\/api\/sponsorships\/[^/]+\/refresh$/, async (route) => {
    await held;
    await route.continue();
  });
  await page.goto('/dashboard');
  await page.getByRole('link', { name: 'Payments', exact: true }).click();
  const requests = page.getByRole('region', { name: 'Requests to my employer' }).last();
  await requests.getByRole('button', { name: 'Check again' }).click();

  await expect(requests.getByRole('button', { name: 'Check again' })).toBeDisabled();
  await expect(requests.getByRole('button', { name: 'Cancel request' })).toBeDisabled();
  release();
  await expect(requests.getByRole('button', { name: 'Cancel request' })).toBeEnabled();
});
