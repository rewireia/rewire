import { marketCatalogueSchema } from '@rewire/contracts';

import { expect, test } from './support/test.ts';

test('demo sign-in returns to the learning plan, and sign-out locks the dashboard', async ({
  page,
}) => {
  await page.goto('/us/plan/4313');
  await page.locator('main').getByRole('link', { name: 'Sign in', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Sign in', exact: true });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText('Rewire', { exact: true })).toBeVisible();
  await expect(dialog.getByText('DemoDemoDemo', { exact: true })).toBeVisible();
  await dialog.getByRole('textbox', { name: 'Username', exact: true }).fill('Rewire');
  await dialog.getByLabel('Password', { exact: true }).fill('wrong');
  await dialog.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(dialog.getByRole('alert')).toContainText('Demo');
  await dialog.getByLabel('Password', { exact: true }).fill('DemoDemoDemo');
  await dialog.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page).toHaveURL(/\/us\/plan\/4313$/);
  await expect(
    page.getByRole('heading', { name: 'From your report to your training' }),
  ).toBeVisible();
  await expect(
    page.getByRole('group', { name: 'How much would you like to invest?' }),
  ).toBeVisible();
  await page.goto('/dashboard');
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Sign in', exact: true })).toBeVisible();
  expect((await page.request.get('/api/payments')).status()).toBe(401);
});

test('Business has its own access and sets the sandbox price of a course', async ({ page }) => {
  await page.goto('/business');
  const dialog = page.getByRole('dialog', { name: 'Sign in', exact: true });
  await dialog.getByRole('textbox', { name: 'Username', exact: true }).fill('rewire');
  await dialog.getByLabel('Password', { exact: true }).fill('DemoDemoDemo');
  await dialog.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(dialog).toBeHidden();
  expect((await page.request.get('/api/payments')).status()).toBe(401);
  const catalogue = await page.request.get('/api/business/catalogue?region=us');
  expect(catalogue.ok()).toBe(true);
  const result = marketCatalogueSchema.parse(await catalogue.json());
  const original = result.courses.find((course) => course.courseId === 'ai-foundations');
  if (original === undefined) throw new Error('The catalogue has no introductory course');
  await page.getByRole('button', { name: 'My courses', exact: true }).click();
  await expect(page.getByRole('button', { name: /AI foundations/ }).first()).toBeVisible();
  await page
    .getByRole('button', { name: /AI foundations/ })
    .first()
    .click();
  const terms = page.getByRole('spinbutton', { name: /Sandbox price/ });
  await expect(terms).toBeVisible();
  try {
    await terms.fill('40');
    await page.getByRole('button', { name: 'Save terms', exact: true }).click();
    await expect(terms).toBeHidden();
    const saved = marketCatalogueSchema.parse(
      await (await page.request.get('/api/business/catalogue?region=us')).json(),
    );
    expect(saved.courses.find((course) => course.courseId === original.courseId)).toMatchObject({
      priceMinor: 4000,
    });
  } finally {
    await page.request.put(`/api/business/catalogue/${original.courseId}`, { data: original });
  }
});
