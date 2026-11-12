import { expect, test } from './support/test.ts';

const cases = [
  { width: 1440, theme: 'light', language: 'en' },
  { width: 1440, theme: 'dark', language: 'es' },
  { width: 390, theme: 'light', language: 'es' },
  { width: 390, theme: 'dark', language: 'en' },
] as const;

for (const scenario of cases) {
  test(`Rex composer stays visible at ${scenario.width} in ${scenario.theme}`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width: scenario.width, height: 950 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.addInitScript(({ theme, language }) => {
      localStorage.setItem('rewire.preferences', JSON.stringify({ theme, language, region: 'us' }));
    }, scenario);
    await page.goto('/start');
    const es = scenario.language === 'es';
    const input = page.getByRole('textbox', {
      name: es ? '¿A qué te dedicas?' : 'What do you do at work?',
    });
    const send = page.getByRole('button', { name: es ? 'Enviar' : 'Send', exact: true });
    await expect(input).toBeInViewport({ ratio: 1 });
    await page.screenshot({ animations: 'disabled', path: testInfo.outputPath('rex-welcome.png') });
    await input.fill('trabajo en una pizzería');
    await input.press('Enter');
    await expect(
      page.getByRole('heading', {
        name: es
          ? '¿Preparas comida, atiendes a clientes, repartes pedidos o haces otra cosa?'
          : 'Do you prepare food, serve customers, deliver orders, or do something else?',
      }),
    ).toBeVisible();
    await expect(input).toBeInViewport({ ratio: 1 });
    await expect(send).toBeInViewport({ ratio: 1 });
    const inputBox = await input.boundingBox();
    const sendBox = await send.boundingBox();
    expect(inputBox).not.toBeNull();
    expect(sendBox).not.toBeNull();
    if (!inputBox || !sendBox) throw new Error('Rex composer is not visible');
    expect(inputBox.y + inputBox.height).toBeLessThanOrEqual(950);
    expect(sendBox.y + sendBox.height).toBeLessThanOrEqual(950);
    const widths = await page.evaluate<{ page: number; viewport: number }>(
      '({ page: document.documentElement.scrollWidth, viewport: document.documentElement.clientWidth })',
    );
    expect(widths.page).toBeLessThanOrEqual(widths.viewport);
    await page.screenshot({ animations: 'disabled', path: testInfo.outputPath('rex-reply.png') });
  });
}
