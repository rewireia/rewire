import { expect, test, type Page } from './support/test.ts';

const entries = [
  'Home',
  'Start',
  'Dashboard',
  'What is AI',
  'How it works',
  'Explore',
  'Library',
  'Courses',
];
const profiles = [
  { role: 'learner', choice: 'Individual', path: '/dashboard' },
  { role: 'business', choice: 'Business', path: '/business' },
] as const;

async function chooseProfile(page: Page, choice: string) {
  // A fresh entry to the home page, not a reload of the welcome, asks for region and profile.
  await page.goto('/what-is-rewire');
  await page.goto('/');
  await page
    .getByRole('dialog', { name: 'Choose your region' })
    .getByRole('button', { name: 'United States' })
    .click();
  await page
    .getByRole('navigation', { name: 'Choose how to enter' })
    .getByRole('button', { name: new RegExp(choice) })
    .click();
  const heading = choice === 'Individual' ? 'Rewire your skills.' : 'Your courses, connected.';
  await expect(page.getByRole('heading', { name: heading })).toBeVisible();
}

async function checkMenu(page: Page, path: string) {
  await page.getByRole('button', { name: 'Menu', exact: true }).click();
  const menu = page.getByRole('dialog', { name: 'Menu', exact: true });
  await expect(menu.locator('nav li')).toHaveText(entries);
  await expect(menu.getByRole('link', { name: 'Dashboard', exact: true })).toHaveAttribute(
    'href',
    path,
  );
  return menu;
}

for (const profile of profiles) {
  test(`${profile.role} uses its matching demo workspace and can switch roles`, async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await chooseProfile(page, profile.choice);
    expect(
      ((await (await page.request.get('/api/session')).json()) as { accessRole: string })
        .accessRole,
    ).toBe(profile.role);
    const menu = await checkMenu(page, profile.path);
    await menu.getByRole('link', { name: 'Dashboard', exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`${profile.path}$`));
    await expect(page.getByRole('dialog', { name: 'Sign in', exact: true })).toHaveCount(0);
    await page.reload();
    const persisted = await checkMenu(page, profile.path);
    await persisted.getByRole('link', { name: 'Home', exact: true }).click();
    await expect(page).toHaveURL(/\/$/);
    const welcome = profile.role === 'learner' ? 'Rewire your skills.' : 'Your courses, connected.';
    await expect(page.getByRole('heading', { name: welcome })).toBeVisible();
    await expect(page.getByRole('dialog', { name: 'Choose your region' })).toHaveCount(0);
    const other = profiles.find((entry) => entry.role !== profile.role);
    if (other === undefined) throw new Error('The other profile must exist');
    await chooseProfile(page, other.choice);
    expect(
      ((await (await page.request.get('/api/session')).json()) as { accessRole: string })
        .accessRole,
    ).toBe(other.role);
    const otherMenu = await checkMenu(page, other.path);
    await otherMenu.getByRole('link', { name: 'Dashboard', exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`${other.path}$`));
    if (other.role === 'business')
      expect((await page.request.get('/api/payments')).status()).toBe(401);
    else expect((await page.request.get('/api/business/sales')).status()).toBe(401);
  });
}
