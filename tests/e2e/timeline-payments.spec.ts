import { readFile } from 'node:fs/promises';

import { expect, test, type Page } from './support/test.ts';

import { signIn } from './support/sign-in.ts';

const COURSE = 'ai-foundations';
/** The test server itself: its `/test/` routes are not behind the web's `/api` proxy. */
const TEST_SERVER = 'http://127.0.0.1:8290';

test.beforeEach(async ({ context, page }) => {
  // Nothing leaves the machine: PayPal's script is refused, as without a network.
  await context.route(/paypal\.com/, (route) => route.abort());
  await signIn(page);
  const profile = await page.request.put('/api/session/profile', {
    data: {
      region: 'us',
      occupation: { code: '43-3051.00', title: 'Payroll and Timekeeping Clerks', isco08: '4313' },
      timeByTask: {},
    },
  });
  expect(profile.ok()).toBe(true);
});

/** The learner's roadmap on the dashboard, with its chart drawn. */
async function openRoadmap(page: Page): Promise<void> {
  await page.goto('/dashboard?tab=roadmap');
  await expect(
    page.getByRole('treegrid', { name: 'The courses of your plan in time' }),
  ).toBeVisible();
}

/** A day some days from today, as the server writes it. */
function dayFromToday(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

/** Saves a plan begun five weeks ago, so the paid course's day has come and gone. */
async function startWeeksAgo(page: Page): Promise<void> {
  const query = `isco08=4313&today=${dayFromToday(0)}`;
  const read = await page.request.get(`/api/regions/us/study-plan?${query}`);
  const { plan } = (await read.json()) as { plan: Record<string, unknown> };
  const saved = await page.request.put(`/api/regions/us/study-plan?${query}`, {
    data: { ...plan, startsOn: dayFromToday(-35) },
  });
  expect(saved.ok()).toBe(true);
}

/** Pays for the course with the fake PayPal of the test server. */
async function buy(page: Page): Promise<void> {
  const opened = await page.request.post('/api/checkout/orders', {
    data: { courseId: COURSE, region: 'us' },
  });
  const { orderId } = (await opened.json()) as { orderId: string };
  const captured = await page.request.post(`/api/checkout/orders/${orderId}/capture`, {
    data: {},
  });
  expect(captured.ok()).toBe(true);
}

const bar = (page: Page) => page.locator(`.b-gantt-task-wrap[data-task-id="${COURSE}"]`);
// The chart's table and its timeline each have a row for the payment: the table's comes first.
const payment = (page: Page) => page.getByRole('row', { name: /PayPal · \$19/ }).first();

test('a paid course waits for its payment, starts when paid and waits again once refunded', async ({
  page,
}) => {
  await startWeeksAgo(page);
  await openRoadmap(page);
  // The head of the roadmap counts the Rewire courses paid and still to pay.
  const head = page.getByRole('region', { name: 'My roadmap' });
  await expect(bar(page)).toContainText('Waiting for payment');
  await expect(payment(page)).toContainText('To be paid');
  await expect(head.getByText('0 paid · 3 to pay', { exact: true })).toBeVisible();

  await buy(page);
  await openRoadmap(page);
  await expect(payment(page)).toContainText('Paid on');
  await expect(bar(page)).not.toContainText('Waiting for payment');
  await expect(head.getByText('1 paid · 2 to pay', { exact: true })).toBeVisible();

  await page.goto('/dashboard');
  await page.getByRole('link', { name: 'Payments', exact: true }).click();
  const payments = page.getByRole('region', { name: 'My payments' });
  await payments.getByRole('button', { name: 'Refund' }).click();
  await page
    .getByRole('dialog', { name: 'Refund this course?' })
    .getByRole('button', {
      name: 'Refund',
    })
    .click();
  await expect(payments.getByText('Refunded', { exact: true })).toBeVisible();

  await openRoadmap(page);
  await expect(payment(page)).toContainText('Refunded');
  await expect(bar(page)).toContainText('Waiting for payment');
});

test('an invoice sent to the employer shows on the plan, which unlocks once it is paid', async ({
  page,
}) => {
  test.setTimeout(60_000);
  const widgetErrors: string[] = [];
  page.on('pageerror', (error) => {
    if (error.message.includes('already in use')) widgetErrors.push(error.message);
  });
  page.on('console', (message) => {
    if (message.type() === 'error' && message.text().includes('already in use'))
      widgetErrors.push(message.text());
  });
  await page.goto(`/us/courses/${COURSE}`);
  await page.getByRole('textbox', { name: 'Your employer’s email' }).fill('payroll@example.com');
  await page.getByRole('button', { name: 'Send the invoice' }).click();
  await expect(page.getByText('Status: Sent, not paid yet')).toBeVisible();
  await startWeeksAgo(page);

  await openRoadmap(page);
  await expect(payment(page)).toContainText('Invoice sent to your employer');
  await expect(bar(page)).toContainText('Waiting for payment');

  const list = (await (await page.request.get('/api/sponsorships')).json()) as {
    sponsorships: { payUrl: string }[];
  };
  const invoiceId = list.sponsorships[0]?.payUrl.split('#').pop() ?? '';
  const paid = await page.request.post(`${TEST_SERVER}/test/invoices/${invoiceId}/pay`);
  expect(paid.status()).toBe(204);

  // No reload: the plan watches a payment still out and reads itself again.
  await expect(payment(page)).toContainText('Paid on', { timeout: 40_000 });
  await expect(bar(page)).not.toContainText('Waiting for payment');
  expect(widgetErrors).toEqual([]);
});

test('reopening the timeline gives each chart a distinct widget identity', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => {
    errors.push(error.message);
  });
  page.on('console', (message) => {
    if (message.type() === 'error' && message.text().includes('already in use'))
      errors.push(message.text());
  });
  await openRoadmap(page);
  const timelineView = page.getByRole('radio', { name: 'Timeline', exact: true });
  const listView = page.getByRole('radio', { name: 'List', exact: true });
  const ids = new Set<string>();
  for (let attempt = 0; attempt < 3; attempt += 1) {
    if (attempt > 0) await timelineView.check();
    const chart = page.locator('.rewire-gantt .b-gantt').first();
    await expect(chart).toBeVisible();
    const id = await chart.getAttribute('id');
    expect(id).toBeTruthy();
    if (id) ids.add(id);
    await listView.check();
    await expect(chart).toHaveCount(0);
  }
  expect(ids.size).toBe(3);
  expect(errors).toEqual([]);
});

test('Tempo changes the plan, and the pace and the chart follow behind its panel', async ({
  page,
}) => {
  await openRoadmap(page);
  const section = page.getByRole('main');
  // The head of the roadmap states the pace, as the server computes it.
  const head = page.getByRole('region', { name: 'My roadmap' });
  await expect(head.getByText(/ · 4 h a week$/)).toBeVisible();
  const fluency = page.locator(
    '.b-gantt-task-wrap[data-task-id="ai-fluency-framework-foundations"]',
  );
  const before = await fluency.getAttribute('style');

  await section.getByRole('button', { name: 'I only have 2 hours a week' }).click();
  const guide = page.getByRole('dialog');
  await expect(guide.getByText('I have changed your plan in time.')).toBeVisible();
  await expect(guide.getByText('Your plan in time, changed', { exact: false })).toBeVisible();

  await expect(head.getByText(/ · 2 h a week$/)).toBeVisible();
  await expect(fluency).not.toHaveAttribute('style', before ?? '');
});

test('"Add to my calendar" gives the plan as a calendar file, one event per course', async ({
  page,
}) => {
  await openRoadmap(page);
  const section = page.getByRole('main');
  const download = page.waitForEvent('download');
  await section.getByRole('button', { name: 'Add to my calendar' }).click();
  const file = await download;
  expect(file.suggestedFilename()).toBe('rewire-plan.ics');
  const text = await readFile(await file.path(), 'utf8');
  expect(text).toMatch(/^BEGIN:VCALENDAR\r\n/);
  expect(text.match(/BEGIN:VEVENT/g)?.length ?? 0).toBeGreaterThanOrEqual(8);
  expect(text).toContain('SUMMARY:Introduction to AI\r\n');
  expect(text).toMatch(/DTSTART;VALUE=DATE:\d{8}\r\nDTEND;VALUE=DATE:\d{8}/);
});
