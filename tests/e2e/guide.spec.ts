import { expect, test } from './support/test.ts';
import { signIn } from './support/sign-in.ts';
import { completePayrollJourney } from './support/work-journey.ts';
import { z } from 'zod';

// The test server answers with a deterministic stand-in for the language model.

/** The tasks of a report as the API serves them, most exposed first. */
const reportTasksSchema = z.object({
  tasks: z.array(z.object({ id: z.string(), score: z.number() })).min(1),
});
test.beforeEach(async ({ context }) => {
  await context.route(/paypal\.com/, (route) => route.abort());
});

test('a job described in plain words leads to proposed occupations', async ({ page }) => {
  await page.goto('/start');
  const composer = page.getByRole('textbox', { name: 'What do you do at work?' });
  await composer.fill('I handle payroll and wages for hospital staff');
  await composer.press('Enter');
  await expect(
    page.getByRole('heading', { name: 'Which occupation fits your work?' }),
  ).toBeVisible();
  const search = page.getByRole('textbox', { name: 'Search by job title' });
  if (!(await search.isVisible()))
    await page.getByText('Search by job title', { exact: true }).first().click();
  await search.fill('payroll clerk');
  await expect(
    page.getByRole('button', { name: /Payroll and Timekeeping Clerks/ }).first(),
  ).toBeVisible();
});

test('"Explain my report" writes words, and the page draws each task with its own score', async ({
  page,
}) => {
  const report = reportTasksSchema.parse(
    await (await page.request.get('/api/unit-groups/4313')).json(),
  );
  const [first] = report.tasks;
  const score = Math.round((first?.score ?? Number.NaN) * 100);
  await page.goto('/us/report/4313');
  await page.getByRole('button', { name: 'Explain my report' }).click();

  const explanation = page.getByRole('region', { name: 'In plain words' });
  const reference = explanation.getByRole('link', { name: 'task 1 ·' });
  await expect(reference).toHaveText(`task 1 · ${String(score)} of 100`);
  await expect(reference).toHaveAttribute('href', `#task-${first?.id ?? ''}`);
  // The list of the tasks mentioned says the score again, with its band.
  await expect(
    explanation.getByText(new RegExp(`^Task 1 · ${String(score)} of 100 · `)),
  ).toBeVisible();
  await expect(explanation.getByText(/not a prediction about anyone’s job/)).toBeVisible();
});

test('asking Tempo to buy a course brings the purchase card with its price', async ({ page }) => {
  // The confirmed occupation is what Tempo reads when no report is in view.
  await signIn(page);
  await page.goto('/start');
  await completePayrollJourney(page);
  // Tempo, the plan agent, is written to from the roadmap; its panel opens with the request.
  await page.goto('/dashboard?tab=roadmap');
  await page
    .getByRole('textbox', { name: 'Tell Tempo what changed' })
    .fill('I want to buy a course');
  await page.getByRole('button', { name: 'Ask Tempo' }).click();
  const guide = page.getByRole('dialog');

  await expect(guide.getByText(/I have prepared the purchase of/)).toBeVisible();
  await expect(guide.getByText(/not a prediction about anyone’s job/)).toBeVisible();
  // The card of the order the server opened: its amount is the server's, never the model's.
  const card = guide.getByText('Ready for PayPal', { exact: true }).locator('..');
  await expect(card).toContainText('AI foundations');
  await expect(card.getByText(/^\$\d+(\.\d\d)?$/)).toBeVisible();
});

test('a task reference reaches its cited evidence while retaining AG Grid', async ({ page }) => {
  await page.goto('/us/report/4313');
  // References point to the cited evidence without expanding the task table.
  const table = page.getByRole('region', { name: 'Task by task, as a table' });
  await expect(table).toBeVisible();
  await page.getByRole('button', { name: 'Explain my report' }).click();

  const reference = page.getByRole('region', { name: 'In plain words' }).getByRole('link', {
    name: 'task 1 ·',
  });
  const anchor = (await reference.getAttribute('href')) ?? '';
  await reference.click();

  await expect(table).toHaveCount(1);
  await expect(page.getByRole('radio', { name: 'List' })).toHaveCount(0);
  await expect(page).toHaveURL(new RegExp(`${anchor}$`));
  await expect(page.locator(anchor)).toBeInViewport();
});

test('a generated explanation stays available and can only be folded or reopened', async ({
  page,
}) => {
  await page.goto('/us/report/4313');
  await page.getByRole('button', { name: 'Explain my report', exact: true }).click();
  const summary = page.getByRole('region', { name: 'In plain words' });
  const reference = summary.getByRole('link', { name: 'task 1 ·' });
  await expect(reference).toBeVisible();
  await expect(page.getByRole('button', { name: /Explain (my report|it again)/ })).toHaveCount(0);
  const text = await reference.textContent();
  await summary.locator('summary').click();
  await expect(reference).toBeHidden();
  await summary.locator('summary').click();
  await expect(reference).toBeVisible();
  await expect(reference).toHaveText(text ?? '');
});
