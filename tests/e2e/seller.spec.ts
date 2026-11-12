import { courseCatalogueSchema, marketSalesSchema } from '@rewire/contracts';

import { expect, test, type Page } from './support/test.ts';

test.use({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });

const TITLE = 'Spreadsheet automation with AI assistants';

async function signInAs(page: Page, role: 'learner' | 'business') {
  const response = await page.request.post('/api/session/sign-in', {
    data: { username: 'Rewire', password: 'DemoDemoDemo', role },
  });
  expect(response.ok()).toBe(true);
}

async function shopCourse(page: Page) {
  const shop = courseCatalogueSchema.parse(
    await (await page.request.get('/api/regions/us/courses')).json(),
  );
  return shop.courses.find((course) => course.title === TITLE);
}

async function publishCourse(page: Page) {
  await page.getByRole('button', { name: 'Publish a course', exact: true }).click();
  await page.getByLabel('Title', { exact: true }).fill(TITLE);
  await page
    .getByLabel('Description', { exact: true })
    .fill(
      'Build spreadsheet formulas and clean tables with an AI assistant, and check every result.',
    );
  await page.getByLabel('Hours', { exact: true }).fill('3');
  await page.getByLabel('AI in everyday work', { exact: true }).check();
  await page.getByLabel('Sandbox price (USD)', { exact: true }).fill('24');
  await page.getByLabel('Access address', { exact: true }).fill('https://learn.example.com/sheets');
  await page.getByRole('button', { name: 'Publish now', exact: true }).click();
  await expect(page.getByText(`“${TITLE}” is on sale in the shop.`)).toBeVisible();
  await expect(page.getByRole('link', { name: 'See it in the shop' })).toBeVisible();
}

/** The test server's payment gateway is a deterministic local fixture, not PayPal. */
test('a course published by the seller is sold, paid, and discounted by a beacon', async ({
  page,
  context,
}, testInfo) => {
  await context.route(/paypal\.com/, (route) => route.abort());
  await page.addInitScript(() => {
    sessionStorage.setItem('rewire.opening', '1');
    localStorage.setItem(
      'rewire.preferences',
      JSON.stringify({ language: 'en', theme: 'light', region: 'us', regionChosen: true }),
    );
  });
  await signInAs(page, 'business');
  await page.goto('/business');
  await publishCourse(page);
  await page.screenshot({ path: testInfo.outputPath('published.png') });

  const card = await shopCourse(page);
  expect(card).toMatchObject({ provider: 'Sun School', price: { minorUnits: 2400 } });
  if (card === undefined) throw new Error('The course is not in the shop');
  await page.getByRole('button', { name: 'My courses', exact: true }).click();
  await page.getByRole('radio', { name: 'Created here', exact: true }).check();
  await expect(page.getByRole('button', { name: `Edit terms of ${TITLE}` })).toBeVisible();

  // The learner buys it; the server opens the order and the test gateway approves it.
  await signInAs(page, 'learner');
  const opened = await page.request.post('/api/checkout/orders', {
    data: { region: 'us', courseId: card.id, courseIds: [card.id] },
  });
  expect(opened.ok()).toBe(true);
  const order = (await opened.json()) as { orderId: string };
  expect(
    (await page.request.post(`/api/checkout/orders/${order.orderId}/capture`, { data: {} })).ok(),
  ).toBe(true);
  const access = await page.request.get(`/api/learning/listed-courses/${card.id}`);
  expect(((await access.json()) as { url: string }).url).toBe('https://learn.example.com/sheets');

  await signInAs(page, 'business');
  const sales = marketSalesSchema.parse(
    await (await page.request.get('/api/business/sales')).json(),
  );
  expect(sales.sales.find((sale) => sale.orderId === order.orderId)?.title).toBe(TITLE);
  await page.goto('/business');
  await page.getByRole('button', { name: 'Sales', exact: true }).click();
  const row = page.getByRole('region', { name: 'Sales' }).locator(`[row-id="${order.orderId}"]`);
  await expect(row.getByRole('gridcell', { name: TITLE, exact: true })).toBeVisible();

  // A 25 % beacon from now: the shop's price falls by a quarter at once.
  await page.getByRole('button', { name: 'Discount beacons', exact: true }).click();
  await page.getByRole('radio', { name: '25 %', exact: true }).check();
  await page.getByRole('button', { name: '1 h', exact: true }).click();
  await expect(page.getByText(/^25 % off .* courses, from /)).toBeVisible();
  await page.getByRole('button', { name: 'Activate beacon', exact: true }).click();
  await expect(page.getByText('Active', { exact: true })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('beacon.png') });
  const discounted = await shopCourse(page);
  expect(discounted?.price.minorUnits).toBe(1800);
  expect(discounted?.offer).toMatchObject({ percent: 25, listPrice: { minorUnits: 2400 } });
});
