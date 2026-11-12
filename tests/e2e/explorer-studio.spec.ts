import { expect, test, type Page } from './support/test.ts';

test.beforeEach(async ({ context }) => {
  await context.route(/paypal\.com/, (route) => route.abort());
});

/**
 * Without a licence key AG Studio prints its trial notice, a framed block of `*` lines, as console
 * errors. That notice is expected; any other error is not.
 */
const TRIAL_NOTICE = /^\*.*\*$/;

function watchConsole(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error' && !TRIAL_NOTICE.test(message.text().trim())) {
      errors.push(message.text());
    }
  });
  page.on('pageerror', (error) => errors.push(error.message));
  return errors;
}

/** The figure under a key-figure title of the dashboard. */
function figure(page: Page, title: string) {
  return page
    .locator('[class*="ag-studio"]', { hasText: title })
    .getByText(/^[\d,]+$/)
    .first();
}

test('on a wide screen "Analyse" shows the key figures, and a major group filters them', async ({
  page,
}) => {
  const errors = watchConsole(page);
  await page.goto('/explore');
  await expect(page.getByRole('radio', { name: 'Analyse' })).toBeChecked();
  const scored = figure(page, 'Occupations scored');
  await expect(scored).toHaveText('427');

  await page.getByText('4 · Clerical support workers', { exact: true }).click();
  await expect(scored).toHaveText('29');
  expect(errors).toEqual([]);
});

test('"Edit layout" opens the widget palette and "Done" closes it', async ({ page }) => {
  await page.goto('/explore');
  await expect(figure(page, 'Occupations scored')).toHaveText('427');
  await page.getByRole('button', { name: 'Edit layout' }).click();
  await expect(page.getByText('Compose', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Done' }).click();
  await expect(page.getByText('Compose', { exact: true })).toBeHidden();
});

test('a change stays after a reload, and "Reset" undoes it', async ({ page }) => {
  await page.goto('/explore');
  const scored = figure(page, 'Occupations scored');
  await page.getByText('4 · Clerical support workers', { exact: true }).click();
  await expect(scored).toHaveText('29');

  await page.reload();
  await expect(scored).toHaveText('29');
  await page.getByRole('button', { name: 'Reset' }).click();
  await expect(scored).toHaveText('427');
  await page.reload();
  await expect(scored).toHaveText('427');
});

test('"Table" brings the table back, and the choice is kept', async ({ page }) => {
  await page.goto('/explore');
  await page.getByRole('radio', { name: 'Table' }).check();
  await expect(page.getByText('427 of 427 occupations shown.')).toBeVisible();
  await page.reload();
  await expect(page.getByText('427 of 427 occupations shown.')).toBeVisible();
});

test('a phone gets the table only, and never downloads AG Studio', async ({ page }) => {
  const requested: string[] = [];
  page.on('request', (request) => requested.push(request.url()));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/explore');
  await expect(page.getByText('427 of 427 occupations shown.')).toBeVisible();
  await expect(page.getByRole('radio', { name: 'Analyse' })).toHaveCount(0);
  expect(requested.filter((url) => /ag-studio|ExploreStudio/i.test(url))).toEqual([]);
});

test('"Ask the analyst" opens its panel, and the analyst reads an occupation’s tasks', async ({
  page,
}) => {
  const errors = watchConsole(page);
  await page.goto('/explore');
  await page.getByRole('button', { name: 'Ask the analyst' }).click();
  await expect(
    page.getByRole('main').getByRole('link', { name: 'Privacy', exact: true }),
  ).toBeVisible();
  await page.getByText('Why do data entry clerks score so high?', { exact: true }).click();
  await expect(
    page.getByText(/^Data Entry Clerks score 70 out of 100 \(ILO, 2025\)/),
  ).toBeVisible();
  expect(errors).toEqual([]);
});

test('the analyst hands a filter to Studio’s page agent, which applies it', async ({ page }) => {
  await page.goto('/explore');
  const scored = figure(page, 'Occupations scored');
  await expect(scored).toHaveText('427');
  await page.getByRole('button', { name: 'Ask the analyst' }).click();
  await page.getByText('Focus on clerical work', { exact: true }).click();
  await expect(
    page.getByText(/^I filtered the page to 4 · Clerical support workers/),
  ).toBeVisible();
  await expect(scored).toHaveText('29');
});

test('"Occupation in focus" shows the tasks of the occupation chosen in a table', async ({
  page,
}) => {
  await page.goto('/explore');
  const focus = page.getByRole('article', { name: 'Occupation in focus' });
  await expect(focus.getByRole('heading')).toHaveText('Data Entry Clerks');
  await page
    .getByRole('gridcell', { name: 'Typists and Word Processing Operators' })
    .first()
    .click();
  await expect(focus.getByRole('heading')).toHaveText('Typists and Word Processing Operators');
  await expect(focus.getByRole('listitem').first()).toContainText('Checking completed work');
  await expect(focus.getByRole('link', { name: 'Open the report' })).toHaveAttribute(
    'href',
    /\/report\/4131/,
  );
});

test('the menu of a row drills through to it, and opens its report', async ({ page }) => {
  await page.goto('/explore');
  const row = page.getByRole('gridcell', { name: 'Typists and Word Processing Operators' }).first();
  await row.click({ button: 'right' });
  await page.getByText('Drill through to this', { exact: true }).click();
  await expect(page.getByText(/^Drilled through to: 4131/)).toBeVisible();
  await expect(figure(page, 'Occupations scored')).toHaveText('1');
  await page.getByRole('button', { name: 'Show everything' }).click();
  await expect(figure(page, 'Occupations scored')).toHaveText('427');

  await row.click({ button: 'right' });
  await page.getByText('Open the report of this occupation', { exact: true }).click();
  await expect(page).toHaveURL(/\/us\/report\/4131/);
});

test('"Undo" takes back the last change while editing, and "Redo" brings it again', async ({
  page,
}) => {
  await page.goto('/explore');
  const scored = figure(page, 'Occupations scored');
  await page.getByRole('button', { name: 'Edit layout' }).click();
  const undo = page.getByRole('button', { name: 'Undo' });
  await expect(undo).toBeDisabled();
  await page.getByText('4 · Clerical support workers', { exact: true }).first().click();
  await expect(scored).toHaveText('29');
  await undo.click();
  await expect(scored).toHaveText('427');
  await page.getByRole('button', { name: 'Redo' }).click();
  await expect(scored).toHaveText('29');
});

test('the second page sets each major group against the levels', async ({ page }) => {
  await page.goto('/explore');
  await page.getByRole('radio', { name: 'Groups and levels' }).check();
  await expect(page.getByText('Occupations by major group and level')).toBeVisible();
  await expect(page.getByText('Levels within each major group')).toBeVisible();
});
