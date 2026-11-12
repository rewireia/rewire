import { expect, test } from './support/test.ts';

test.beforeEach(async ({ context }) => {
  await context.route(/paypal\.com/, (route) => route.abort());
});

test('the opening leads to region, role, demo access and an explicit Start', async ({ page }) => {
  await page.goto('/');
  const opening = page.locator('[data-phase]');
  await expect(opening).toBeVisible();
  await expect(page.getByRole('heading', { level: 1, name: 'Rewire' })).toBeAttached();
  await page.keyboard.press('Space');
  await expect(opening).toHaveCount(0);

  const gate = page.getByRole('dialog', { name: 'Choose your region' });
  const choice = page.getByRole('navigation', { name: 'Choose how to enter' });
  await expect(gate).toBeVisible();
  const photo = page.locator('[data-home-scene] img');
  const photoSource = await photo.getAttribute('src');
  const scene = page.locator('[data-home-scene]');
  const photoBounds = await scene.boundingBox();
  await gate.getByRole('button', { name: /United Kingdom/ }).click();
  await expect(choice.getByRole('button', { name: /Business/ })).toBeVisible();
  await choice.getByRole('button', { name: /Individual/ }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole('heading', { name: 'Rewire your skills.' })).toBeFocused();
  await expect(photo).toHaveAttribute('src', photoSource ?? '');
  expect(await scene.boundingBox()).toEqual(photoBounds);
  await page.getByRole('link', { name: 'Start', exact: true }).click();
  await expect(page).toHaveURL(/\/start$/);
  await expect(page.getByRole('textbox', { name: 'What do you do at work?' })).toBeVisible();
  await expect(
    page.getByRole('main').getByRole('link', { name: 'Privacy', exact: true }),
  ).toBeVisible();

  // The intro stays played, while each new choice asks for a region again.
  await page.goto('/');
  await expect(opening).toHaveCount(0);
  await expect(gate).toBeVisible();
  await gate.getByRole('button', { name: /United Kingdom/ }).click();
  await choice.getByRole('button', { name: /Individual/ }).click();
  await expect(page.getByRole('heading', { name: 'Rewire your skills.' })).toBeVisible();
  await page.getByRole('button', { name: 'Menu', exact: true }).click();
  const menu = page.getByRole('dialog', { name: 'Menu' });
  await expect(menu.getByRole('radio', { name: 'United Kingdom' })).toBeChecked();
  await menu.getByRole('link', { name: /Start/ }).click();
  await expect(page).toHaveURL(/\/start$/);
});

test('the menu is a modal dialog: it holds the focus, closes with Escape and gives it back', async ({
  page,
}) => {
  await page.goto('/what-is-rewire');
  const opener = page.getByRole('button', { name: 'Menu', exact: true });
  await opener.click();
  const menu = page.getByRole('dialog', { name: 'Menu' });
  await expect(menu).toBeVisible();
  await expect(menu.getByRole('link', { name: 'How it works' })).toHaveAttribute(
    'aria-current',
    'page',
  );
  // The page behind does not scroll while the menu is open.
  await expect(page.locator('html')).toHaveCSS('overflow', 'hidden');
  for (let step = 0; step < 14; step += 1) {
    await page.keyboard.press('Tab');
    await expect(menu.locator(':focus')).toHaveCount(1);
  }
  await page.keyboard.press('Escape');
  await expect(menu).toBeHidden();
  await expect(opener).toBeFocused();
});

test('the menu lists its eight pages in order, and each reading page opens from it', async ({
  page,
}) => {
  await page.goto('/what-is-rewire');
  const opener = page.getByRole('button', { name: 'Menu', exact: true });
  const menu = page.getByRole('dialog', { name: 'Menu' });
  await opener.click();
  await expect(menu.locator('nav li')).toHaveText([
    'Home',
    'Start',
    'Dashboard',
    'What is AI',
    'How it works',
    'Explore',
    'Library',
    'Courses',
  ]);
  await expect(menu.getByRole('button', { name: /Ask Tempo/ })).toHaveCount(0);
  await menu.getByRole('link', { name: 'What is AI' }).click();
  await expect(page).toHaveURL(/\/what-is-ai$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'What is AI, and what does it mean for your work?',
  );
  await expect(page.getByRole('link', { name: /Working Paper 140 of 2025/ })).toHaveAttribute(
    'href',
    'https://doi.org/10.54394/HETP0387',
  );
  await opener.click();
  await menu.getByRole('link', { name: 'Library' }).click();
  await expect(page).toHaveURL(/\/library$/);
  await expect(page.getByText('Readings and reports', { exact: true })).toBeVisible();
  await opener.click();
  await menu.getByRole('link', { name: 'Courses' }).click();
  await expect(page).toHaveURL(/\/courses$/);
});

test('the former address of "How it works" leads to its page, and its moved sections to theirs', async ({
  page,
}) => {
  await page.goto('/how-it-works#payments');
  await expect(page).toHaveURL(/\/what-is-rewire#payments$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'Work is changing. Rewire your skills.',
  );
  await page.goto('/how-it-works#sources');
  await expect(page).toHaveURL(/\/credits$/);
  await page.goto('/how-it-works#privacy');
  await expect(page).toHaveURL(/\/privacy$/);
});

test('language and theme change in the header and the menu, and are kept', async ({ page }) => {
  await page.goto('/what-is-rewire');
  await page.getByRole('radio', { name: 'Español' }).check();
  await expect(page.locator('html')).toHaveAttribute('lang', 'es');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.getByRole('button', { name: 'Tema claro' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.getByRole('button', { name: 'Tema oscuro' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(page.getByRole('radio', { name: 'Español' })).toBeChecked();
  await page.getByRole('button', { name: 'Menú', exact: true }).click();
  const menu = page.getByRole('dialog', { name: 'Menú' });
  await expect(menu.getByRole('radio', { name: 'Oscuro' })).toBeChecked();
  await menu.getByRole('radio', { name: 'Reino Unido' }).check();
  await menu.getByRole('radio', { name: 'Claro' }).check();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await menu.getByRole('button', { name: 'Cerrar el menú' }).click();
  await expect(menu).toBeHidden();
});

test('a click on the veil closes the menu, and a link in it opens its page', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/what-is-rewire');
  await page.getByRole('button', { name: 'Menu', exact: true }).click();
  const menu = page.getByRole('dialog', { name: 'Menu' });
  await page.mouse.click(380, 400);
  await expect(menu).toBeHidden();
  await page.getByRole('button', { name: 'Menu', exact: true }).click();
  await menu.getByRole('link', { name: /Explore/ }).click();
  await expect(page).toHaveURL(/\/explore$/);
  await expect(menu).toBeHidden();
});

test('business choice asks for a region even when one was already chosen', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  const gate = page.getByRole('dialog', { name: 'Choose your region' });
  await gate.getByRole('button', { name: /United States/ }).click();
  const choice = page.getByRole('navigation', { name: 'Choose how to enter' });
  await choice.getByRole('button', { name: /Business/ }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: 'Your courses, connected.' })).toBeVisible();
  await page.getByRole('link', { name: 'Open my dashboard' }).click();
  await expect(page).toHaveURL(/\/business$/);
  await page.goto('/');
  await expect(gate).toBeVisible();
});
