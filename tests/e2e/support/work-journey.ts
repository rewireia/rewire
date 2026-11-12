import { expect, type Page } from '@playwright/test';

/** Describes work, chooses an official occupation and saves selected tasks through the real UI. */
export async function completePayrollJourney(page: Page): Promise<void> {
  const composer = page.getByRole('textbox', { name: 'What do you do at work?' });
  await composer.fill('I manage payroll');
  await composer.press('Enter');
  await expect(
    page.getByRole('heading', { name: 'Which occupation fits your work?' }),
  ).toBeVisible();
  const search = page.getByRole('textbox', { name: 'Search by job title' });
  if (!(await search.isVisible()))
    await page.getByText('Search by job title', { exact: true }).first().click();
  await search.fill('payroll clerk');
  await page
    .getByRole('button', { name: /Payroll and Timekeeping Clerks/ })
    .first()
    .click();
  await expect(
    page.getByRole('heading', { name: 'Which tasks are part of your work?' }),
  ).toBeVisible();
  const task = page
    .locator('main li')
    .filter({ has: page.getByRole('checkbox') })
    .first();
  await task.getByRole('checkbox').check();
  await task.getByRole('combobox').selectOption('most');
  await page
    .locator('main li')
    .filter({ has: page.getByRole('checkbox') })
    .nth(1)
    .getByRole('checkbox')
    .check();
  const saved = page.waitForResponse(
    (response) => response.url().endsWith('/api/session/profile') && response.ok(),
  );
  await page.getByRole('button', { name: 'See my report' }).click();
  expect((await saved).ok()).toBe(true);
  await expect(page).toHaveURL(/\/us\/report\/4313/);
}
