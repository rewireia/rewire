import { expect, test } from './support/test.ts';

test('the footer holds the copyright and, beneath it, credits and privacy', async ({ page }) => {
  await page.goto('/what-is-rewire');
  const footer = page.locator('footer').last();
  await expect(footer.getByText(/^© \d{4} Rewire$/)).toBeVisible();
  await expect(footer.getByRole('link')).toHaveText(['Credits and sources', 'Privacy']);
  await expect(page.getByRole('heading', { name: 'Sources' })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Privacy' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Ask the guide' })).toHaveCount(0);

  await footer.getByRole('link', { name: 'Credits and sources' }).click();
  await expect(page).toHaveURL(/\/credits$/);
  await expect(
    page.getByText(/This is an adaptation of a copyrighted work of the International/),
  ).toBeVisible();
  await expect(
    page.getByText(/^Origen de los datos: SEPE, Catálogo de Especialidades Formativas/),
  ).toBeVisible();
  await expect(page.getByText(/ESO\/H\.H\. Heyer, CC BY 4\.0/)).toBeVisible();

  await page.locator('footer').last().getByRole('link', { name: 'Privacy' }).click();
  await expect(page).toHaveURL(/\/privacy$/);
  await expect(page.getByRole('heading', { level: 2, name: 'What is kept' })).toBeVisible();
  await expect(
    page.getByText(/is sent to (an OpenAI model|an AI model outside Rewire)/),
  ).toBeVisible();
  await expect(page.getByText(/employer’s email goes to PayPal with the invoice/)).toBeVisible();
});
