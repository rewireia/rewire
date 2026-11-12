import { expect, test } from './support/test.ts';
import { signIn } from './support/sign-in.ts';
import { findThreeCourses } from './support/training.ts';
import { completePayrollJourney } from './support/work-journey.ts';

test.beforeEach(async ({ context }) => {
  // Nothing leaves the machine: PayPal's script is refused, as without a network.
  await context.route(/paypal\.com/, (route) => route.abort());
});

test('a US payroll clerk finds the job, reads the report and reaches the plan', async ({
  page,
}) => {
  await page.goto('/start');
  await completePayrollJourney(page);
  const session = (await (await page.request.get('/api/session')).json()) as {
    profile: { timeByTask: Record<string, string> };
  };
  expect(Object.values(session.profile.timeByTask)).toContain('most');
  // AG Grid is the only view on every screen.
  await expect(page.getByRole('radio', { name: 'List', exact: true })).toHaveCount(0);
  const week = page.locator('figure', { hasText: 'Your week' }).locator('span').nth(1);
  await expect(page.getByRole('heading', { name: 'Your labour market' })).toBeVisible();
  await expect(page.getByText('Median annual pay', { exact: true })).toBeVisible();

  // The time given to each task is kept in the profile: the report is the same on return.
  const after = await week.textContent();
  await page.reload();
  await expect(week).toHaveText(after ?? '');

  await page.getByRole('link', { name: 'Ask the agent for training tailored to me' }).click();
  await expect(page).toHaveURL(/\/us\/plan\/4313$/);
  await expect(page.getByRole('heading', { name: 'Where AI can do most' })).toBeVisible();
  await expect(page.getByText('Sign in to explore the training available to you.')).toBeVisible();
  await signIn(page);
  await page.reload();
  await findThreeCourses(page);
  await expect(page.getByText(/^Demo courses · suggested dates in \d{4}$/)).toBeVisible();
  await expect(page.getByRole('checkbox', { name: /Choose this course$/ })).toHaveCount(3);
  await expect(page.getByText('Free training', { exact: true })).toHaveCount(0);
});

test('the report is read-only and cannot edit saved time', async ({ page }) => {
  await page.goto('/us/report/4313');
  const table = page.getByRole('region', { name: 'Task by task, as a table' });
  const cell = table.getByRole('gridcell', { name: 'Some', exact: true }).first();
  await expect(cell).toBeVisible();
  await cell.dblclick();
  await page.keyboard.press('Enter');
  await page.keyboard.press('F2');
  await expect(page.getByRole('option')).toHaveCount(0);
  await expect(cell).toHaveText('Some');
  await expect(page.getByRole('button', { name: 'Show details' })).toHaveCount(0);
  await expect(page.getByRole('radio', { name: 'List', exact: true })).toHaveCount(0);
});

test('the task table shows scores and sorts without a download action', async ({ page }) => {
  await page.goto('/us/report/4313');
  const table = page.getByRole('region', { name: 'Task by task, as a table' });
  const bar = table.getByRole('progressbar', { name: 'Score' }).first();
  await expect(bar).toBeVisible();
  const taskHeader = table.getByRole('columnheader', { name: 'Task' });
  await taskHeader.click();
  await expect(taskHeader).toHaveAttribute('aria-sort', 'ascending');
  await taskHeader.click();
  await expect(taskHeader).toHaveAttribute('aria-sort', 'descending');
  const score = Number(await bar.getAttribute('aria-valuenow'));
  expect(score).toBeGreaterThan(0);
  // Read the inline width independently of the rendered label and check its scale.
  const style = (await bar.locator('span').getAttribute('style')) ?? '';
  const width = /width:\s*([\d.]+)%/.exec(style);
  expect(Number(width?.[1])).toBeCloseTo(score, 0);
  await expect(table.getByRole('columnheader', { name: 'Between models' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Download as CSV' })).toHaveCount(0);
});

test.describe('in Spanish', () => {
  test.use({ locale: 'es-ES' });
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('rewire.preferences', JSON.stringify({ language: 'es' }));
    });
  });

  test('clearing every band leaves the table empty, saying why', async ({ page }) => {
    await page.goto('/us/report/4313');
    const table = page.getByRole('region', { name: 'Tarea a tarea, en una tabla' });
    await expect(table.getByRole('row').nth(1)).toBeVisible();
    for (const band of ['Alta', 'Media', 'Baja', 'Muy baja']) {
      await page.getByRole('checkbox', { name: band, exact: true }).uncheck();
    }
    const none = page
      .getByText('Ninguna tarea cae en las bandas elegidas.')
      .filter({ visible: true });
    await expect(
      table.getByText('Ninguna tarea cae en las bandas elegidas.').filter({ visible: true }),
    ).toBeVisible();
    // The sentence is the grid's own, shown once: no second notice under the table.
    await expect(none).toHaveCount(1);
    await expect(table.getByRole('row', { name: /Tu semana/ })).toBeVisible();
  });
});

test('the distribution separates task counts from time weights', async ({ page }) => {
  await page.goto('/us/report/4313');
  const distribution = page.locator('section[aria-labelledby="report-split"]');
  await expect(distribution.locator('canvas').first()).toBeVisible();
  const weekValues = await distribution.locator('li').allTextContents();
  await distribution.getByRole('radio', { name: 'Occupation tasks', exact: true }).check();
  await expect(distribution.getByText('Number of tasks in each exposure band.')).toBeVisible();
  expect(await distribution.locator('li').allTextContents()).not.toEqual(weekValues);
  await distribution.getByRole('radio', { name: 'Your week', exact: true }).check();
  await expect(distribution.locator('li')).toHaveText(weekValues);
});
