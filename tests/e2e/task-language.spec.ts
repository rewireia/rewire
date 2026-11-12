import { expect, test } from './support/test.ts';

test('changing language translates tasks without changing their scores or time', async ({
  page,
}) => {
  let requests = 0;
  await page.route('**/api/unit-groups/9411/task-translations?lang=es', async (route) => {
    requests += 1;
    await route.fulfill({
      json: {
        language: 'es',
        translations: [{ id: '9411-6', text: 'Tomar y servir pedidos de comida y bebida.' }],
      },
    });
  });
  await page.goto('/eu/report/9411');
  const table = page.getByRole('grid');
  const task = table.locator('[col-id="task"]').filter({ hasText: 'Taking and serving' });
  await expect(task).toBeVisible();
  const row = task.locator('..');
  const share = await row.locator('[col-id="share"]').textContent();
  const score = await row.locator('[role="progressbar"]').getAttribute('aria-valuenow');
  await page.getByRole('radio', { name: 'Español', exact: true }).check();
  const translated = table.getByText('Tomar y servir pedidos de comida y bebida.', { exact: true });
  await expect(translated).toBeVisible();
  await expect(
    table
      .getByRole('row')
      .filter({ hasText: 'Tomar y servir pedidos de comida y bebida.' })
      .getByRole('progressbar'),
  ).toHaveAttribute('aria-valuenow', score ?? '');
  await page.getByRole('radio', { name: 'English', exact: true }).check();
  await expect(task).toBeVisible();
  await expect(row.locator('[col-id="share"]')).toHaveText(share ?? '');
  await page.getByRole('radio', { name: 'Español', exact: true }).check();
  await expect(translated).toBeVisible();
  expect(requests).toBe(1);
});
