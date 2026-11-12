import { expect, test } from './support/test.ts';

test('Rex shows three still dots while a reduced-motion response is pending', async ({
  page,
}, testInfo) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  let release: () => void = () => undefined;
  const blocked = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route('**/api/regions/us/occupations/interpret', async (route) => {
    await blocked;
    await route.continue();
  });
  try {
    await page.goto('/start');
    const input = page.getByRole('textbox', { name: 'What do you do at work?' });
    await input.fill('panadera');
    const response = page.waitForResponse((item) => item.url().includes('/occupations/interpret'));
    await input.press('Enter');
    const status = page.getByRole('status', { name: 'Rex is typing…' });
    await expect(status).toBeVisible();
    const dots = status.locator('[data-typing-dot]');
    await expect(dots).toHaveCount(3);
    for (const dot of await dots.all()) await expect(dot).toHaveCSS('animation-name', 'none');
    await page.screenshot({ animations: 'disabled', path: testInfo.outputPath('rex-typing.png') });
    release();
    expect((await response).ok()).toBe(true);
    await expect(status).toHaveCount(0);
    await expect(page.getByRole('button', { name: /baker/i }).first()).toBeVisible();
  } finally {
    release();
  }
});
