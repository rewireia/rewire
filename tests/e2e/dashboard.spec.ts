import { expect, test, type Page } from './support/test.ts';

import { signIn } from './support/sign-in.ts';

test.beforeEach(async ({ context }) => {
  await context.route(/paypal\.com/, (route) => route.abort());
});

/** Buys a course through the isolated test gateway: no PayPal transaction takes place. */
async function buy(page: Page, courseId: string): Promise<void> {
  const opened = await page.request.post('/api/checkout/orders', {
    data: { courseId, region: 'us' },
  });
  const { orderId } = (await opened.json()) as { orderId: string };
  await page.request.post(`/api/checkout/orders/${orderId}/capture`, { data: {} });
}

async function confirmOccupation(page: Page): Promise<void> {
  const saved = await page.request.put('/api/session/profile', {
    data: {
      region: 'us',
      occupation: { code: '43-3051.00', title: 'Payroll and Timekeeping Clerks', isco08: '4313' },
      timeByTask: {},
    },
  });
  expect(saved.ok()).toBe(true);
}

test('the overview shows the course bought, its payment, and a refund closes the course', async ({
  page,
}) => {
  await signIn(page);
  await buy(page, 'checking-ai-work');

  await page.goto('/dashboard');
  const courses = page.getByRole('region', { name: 'My courses' });
  await expect(courses.getByText(/Checking AI work/)).toBeVisible();
  const activity = page.getByRole('region', { name: 'Recent activity' });
  await expect(activity.getByText(/Checking AI work/).first()).toBeVisible();
  await expect(activity.getByText(/Payment to Sun School/).first()).toBeVisible();

  await page.getByRole('link', { name: 'Payments', exact: true }).click();
  const payments = page.getByRole('region', { name: 'My payments' });
  const payment = payments.getByRole('row', { name: /Checking AI work/ });
  await expect(payment).toContainText('$59');
  await expect(payment).toContainText('Paid');
  await expect(payment).toContainText('Sun School');
  // The totals of each currency are pinned at the foot of the table.
  const total = payments.getByRole('row', { name: /Total paid, USD/ });
  await expect(total).toContainText('$59');

  await payment.getByRole('button', { name: 'Refund' }).click();
  const dialog = page.getByRole('dialog', { name: 'Refund this course?' });
  await expect(dialog).toContainText('14 days');
  await dialog.getByRole('button', { name: 'Refund' }).click();
  await expect(payments.getByText('Refunded', { exact: true })).toBeVisible();
  await expect(total).toContainText('$59 refunded');

  await page.getByRole('link', { name: 'Refunds', exact: true }).click();
  await expect(
    page
      .getByRole('region', { name: 'Your refunds' })
      .getByRole('row', { name: /Checking AI work/ }),
  ).toBeVisible();

  await page.getByRole('link', { name: 'Overview', exact: true }).click();
  await expect(page.getByText('You have no courses yet.')).toBeVisible();
});

test('the overview measures the occupation and lays out the next steps', async ({ page }) => {
  await signIn(page);
  await confirmOccupation(page);

  await page.goto('/dashboard');
  await expect(page.getByRole('heading', { name: 'Welcome back.' })).toBeVisible();
  await expect(page.getByRole('meter', { name: 'AI exposure of your occupation' })).toBeVisible();
  const steps = page.getByRole('region', { name: 'Your next steps' });
  await expect(steps.getByRole('listitem').first()).toContainText('Your work, task by task');
  await expect(steps.locator('[aria-current="step"]')).toHaveCount(1);
  await expect(page.getByRole('region', { name: 'Your learning wallet' })).toContainText(
    'PayPal Sandbox: no real money moves.',
  );

  await steps.getByRole('link', { name: 'Open my interactive roadmap' }).first().click();
  await expect(page).toHaveURL(/\?tab=roadmap$/);
  await expect(page.getByRole('treegrid')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Add courses' })).toHaveAttribute('href', '/courses');
  await expect(page.getByRole('region', { name: 'My courses' })).toBeVisible();
});

test('a visitor without a session is invited to start', async ({ page }) => {
  await page.goto('/dashboard');
  const dialog = page.getByRole('dialog', { name: 'Sign in' });
  await expect(dialog.getByRole('textbox', { name: 'Username' })).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Sign in', exact: true })).toBeVisible();
});

test('the old budget address opens the wallet, named in Spanish', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('rewire.preferences', JSON.stringify({ language: 'es' }));
  });
  await signIn(page);
  await page.goto('/dashboard?tab=budget');
  await expect(page.getByRole('link', { name: 'Monedero', exact: true })).toHaveAttribute(
    'aria-current',
    'page',
  );
});

test('the refund dialog opens with the focus on the way back', async ({ page }) => {
  await signIn(page);
  await buy(page, 'checking-ai-work');

  await page.goto('/dashboard?tab=payments');
  const payments = page.getByRole('region', { name: 'My payments' });
  await payments
    .getByRole('row', { name: /Checking AI work/ })
    .getByRole('button', { name: 'Refund' })
    .click();
  const dialog = page.getByRole('dialog', { name: 'Refund this course?' });
  await expect(dialog.getByRole('button', { name: 'Keep the course' })).toBeFocused();
  // A second Enter keeps the course: no money moves.
  await page.keyboard.press('Enter');
  await expect(dialog).toBeHidden();
  await expect(payments.getByText('Paid', { exact: true })).toBeVisible();
});

test('the quick filter finds a payment by its words and its amount as shown', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('rewire.preferences', JSON.stringify({ language: 'es' }));
  });
  await signIn(page);
  await buy(page, 'checking-ai-work');

  await page.goto('/dashboard?tab=payments');
  const payments = page.getByRole('region', { name: 'Mis pagos' });
  const payment = payments.getByRole('row', { name: /Checking AI work/ });
  await expect(payment).toBeVisible();
  const filter = page.getByRole('searchbox', { name: 'Filtrar las tablas' });
  // The status as the table writes it in Spanish, not the server's `completed`.
  await filter.fill('Pagado');
  await expect(payment).toBeVisible();
  await filter.fill('completed');
  await expect(payment).toHaveCount(0);
  // The amount as it is written, not its cents.
  await filter.fill('59 US$');
  await expect(payment).toBeVisible();
  await filter.fill('5900');
  await expect(payment).toHaveCount(0);
});
