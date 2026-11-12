import { expect, test, type Page } from './support/test.ts';

test.beforeEach(async ({ context }) => {
  await context.route(/paypal\.com/, (route) => route.abort());
});

/** On a wide screen the explorer opens on "Analyse"; these journeys are about the table. */
async function openTable(page: Page) {
  await page.goto('/explore');
  await page.getByRole('radio', { name: 'Table' }).check();
}

test('the text filter changes the count the page announces', async ({ page }) => {
  await openTable(page);
  const count = page.getByText(/occupations shown\.$/);
  await expect(count).toHaveText('427 of 427 occupations shown.');
  await expect(count).toHaveAttribute('aria-live', 'polite');

  await page.getByRole('searchbox', { name: 'Filter by title or code' }).fill('payroll');
  await expect(count).toHaveText('1 of 427 occupations shown.');
  await expect(page.getByRole('row', { name: /Payroll Clerks/ })).toBeVisible();

  await page.getByRole('searchbox', { name: 'Filter by title or code' }).fill('no such job');
  await expect(count).toHaveText('0 of 427 occupations shown.');
  await expect(page.getByText('No occupation matches these filters.')).toBeVisible();
});

test('the quick filter finds an occupation by its level, as the table writes it', async ({
  page,
}) => {
  await openTable(page);
  const filter = page.getByRole('searchbox', { name: 'Filter by title or code' });
  await filter.fill('payroll very high');
  await expect(page.getByText('1 of 427 occupations shown.')).toBeVisible();
  // The raw value behind the words is not searched.
  await filter.fill('payroll gradient-4');
  await expect(page.getByText('0 of 427 occupations shown.')).toBeVisible();
});

test('the keyboard alone opens the report of an occupation', async ({ page }) => {
  await openTable(page);
  await page.getByRole('searchbox', { name: 'Filter by title or code' }).fill('4313');
  const title = page.getByRole('link', { name: 'Payroll Clerks' });
  await expect(title).toHaveAttribute('href', /\/report\/4313/);

  // The code cell, not the link: Enter on any cell of the row opens its report.
  await page.getByRole('gridcell', { name: '4313' }).focus();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/report\/4313/);
});

test('the band of regions tells the story of the region chosen, with no credit lines', async ({
  page,
}) => {
  await page.goto('/explore');
  const regions = page.getByRole('group', { name: 'Region of the data' });

  await regions.getByRole('radio', { name: /United Kingdom/ }).check();
  await expect(
    page.getByRole('heading', { level: 2, name: 'The United Kingdom in data' }),
  ).toBeVisible();
  const gauge = page.getByRole('meter', { name: 'Exposure of the average worker' });
  await expect(gauge).toHaveAttribute('aria-valuetext', /^\d+\/100, /);
  await expect(page.getByText(/retrieved on/i)).toHaveCount(0);

  await regions.getByRole('radio', { name: /European Union/ }).check();
  await expect(
    page.getByRole('heading', { level: 2, name: 'The European Union in data' }),
  ).toBeVisible();
  await expect(page.getByText(/sub-major group \(two digits\)/)).toBeVisible();
  await expect(
    page.getByRole('region', {
      name: 'Major groups, their exposure and their share of employment',
    }),
  ).toBeVisible();
  await expect(page.getByRole('heading', { level: 2, name: 'Explore it yourself' })).toBeVisible();
});
