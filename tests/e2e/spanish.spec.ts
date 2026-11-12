import { expect, test } from './support/test.ts';

test.use({ locale: 'es-ES' });

test('a Spanish browser still opens in English', async ({ page, context }) => {
  await context.route(/paypal\.com/, (route) => route.abort());
  await page.goto('/start');
  await expect(page.getByRole('textbox', { name: 'What do you do at work?' })).toBeVisible();
});

test('the start page speaks Spanish once Spanish is chosen', async ({ page, context }) => {
  await context.route(/paypal\.com/, (route) => route.abort());
  await page.addInitScript(() => {
    localStorage.setItem('rewire.preferences', JSON.stringify({ language: 'es' }));
  });
  await page.goto('/start');
  await expect(page.getByRole('heading', { level: 1, name: 'Rex' })).toBeVisible();
  const composer = page.getByRole('textbox', { name: '¿A qué te dedicas?' });
  await composer.fill('panadera');
  await composer.press('Enter');
  await expect(page.getByRole('heading', { name: '¿Es esta tu ocupación?' })).toBeVisible();
  await expect(page.getByRole('button', { name: /baker/i }).first()).toBeVisible();
  await page.getByRole('button', { name: 'Menú', exact: true }).click();
  await page
    .getByRole('dialog', { name: 'Menú' })
    .getByRole('link', { name: 'Cómo funciona' })
    .click();
  await expect(page).toHaveURL(/\/what-is-rewire$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'El trabajo cambia. Reconecta tus habilidades.',
  );
  await page.getByText('El método', { exact: true }).click();
  await expect(page.getByText(/1016 ocupaciones|1\.016 ocupaciones/)).toBeVisible();
});
