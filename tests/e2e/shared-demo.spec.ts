import { expect, test, type Page } from './support/test.ts';

async function enter(page: Page, role: 'learner' | 'business') {
  await page.addInitScript(() => {
    sessionStorage.setItem('rewire.opening', '1');
  });
  await page.goto('/');
  await page
    .getByRole('dialog', { name: 'Choose your region' })
    .getByRole('button', { name: 'United States' })
    .click();
  await page
    .getByRole('navigation', { name: 'Choose how to enter' })
    .getByRole('button', { name: role === 'learner' ? /Individual/ : /Business/ })
    .click();
  await expect(
    page.getByRole('heading', {
      name: role === 'learner' ? 'Rewire your skills.' : 'Your courses, connected.',
    }),
  ).toBeVisible();
}

test('two browsers see the shared learner and the provider sees the same sale', async ({
  page,
  context,
  browser,
}) => {
  await context.route(/paypal\.com/, (route) => route.abort());
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await enter(page, 'learner');
  const report = (await (await page.request.get('/api/unit-groups/4313')).json()) as {
    tasks: { id: string }[];
  };
  const task = report.tasks[0];
  if (!task) throw new Error('The occupation has no tasks');
  const profile = {
    region: 'us',
    occupation: { code: '43-3051.00', title: 'Payroll clerk', isco08: '4313' },
    timeByTask: { [task.id]: 'most' },
  };
  expect((await page.request.put('/api/session/profile', { data: profile })).ok()).toBe(true);
  // Money added with the test server's PayPal stand-in, then a course paid from the wallet.
  const topUp = await page.request.post('/api/wallet/top-ups', {
    data: { region: 'us', amountMinor: 10000 },
  });
  expect(topUp.status()).toBe(201);
  const { topUpId } = (await topUp.json()) as { topUpId: string };
  expect((await page.request.post(`/api/wallet/top-ups/${topUpId}/capture`)).ok()).toBe(true);
  const paid = await page.request.post('/api/wallet/payments', {
    data: { region: 'us', courseIds: ['ai-foundations'] },
  });
  expect(paid.status()).toBe(201);
  const order = (await paid.json()) as { orderId: string };
  const second = await browser.newContext({
    baseURL: 'http://127.0.0.1:5290',
    reducedMotion: 'reduce',
  });
  try {
    await second.route(/paypal\.com/, (route) => route.abort());
    const other = await second.newPage();
    await enter(other, 'learner');
    const session = (await (await other.request.get('/api/session')).json()) as {
      profile: typeof profile;
    };
    expect(session.profile).toEqual(profile);
    const wallet = (await (
      await other.request.get('/api/marketplace/wallet?region=us')
    ).json()) as { fundedMinor: number; spentMinor: number };
    expect(wallet.fundedMinor).toBe(10000);
    expect(wallet.spentMinor).toBeGreaterThan(0);
    const payments = (await (await other.request.get('/api/payments')).json()) as {
      payments: { orderId: string; status: string }[];
    };
    expect(payments.payments.find((payment) => payment.orderId === order.orderId)?.status).toBe(
      'completed',
    );
    await other.goto('/dashboard');
    await expect(
      other.getByRole('region', { name: 'My courses' }).getByText('AI foundations'),
    ).toBeVisible();
    await enter(other, 'business');
    expect((await other.request.get('/api/payments')).status()).toBe(401);
    const sales = (await (await other.request.get('/api/business/sales')).json()) as {
      sales: { id: string; status: string }[];
    };
    expect(sales.sales.find((sale) => sale.id === order.orderId)?.status).toBe('completed');
  } finally {
    await second.close();
  }
});
