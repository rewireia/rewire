import { expect, test, type Page } from './support/test.ts';
import { checkoutFirstCourse, findThreeCourses } from './support/training.ts';
import { fundWallet } from './support/wallet.ts';

const cases = [
  { width: 1440, language: 'en', theme: 'light' },
  { width: 1440, language: 'es', theme: 'dark' },
  { width: 390, language: 'en', theme: 'dark' },
  { width: 390, language: 'es', theme: 'light' },
] as const;

async function fits(page: Page) {
  const widths = await page.evaluate<{ page: number; viewport: number }>(
    '({ page: document.documentElement.scrollWidth, viewport: document.documentElement.clientWidth })',
  );
  expect(widths.page).toBeLessThanOrEqual(widths.viewport);
}
for (const scenario of cases) {
  test(`market screens fit ${scenario.width} ${scenario.language} ${scenario.theme}`, async ({
    page,
    context,
  }, testInfo) => {
    const es = scenario.language === 'es';
    await page.setViewportSize({ width: scenario.width, height: 900 });
    await context.route(/paypal\.com/, (route) => route.abort());
    await page.addInitScript(({ language, theme }) => {
      sessionStorage.setItem('rewire.opening', '1');
      localStorage.setItem('rewire.preferences', JSON.stringify({ language, theme, region: 'us' }));
    }, scenario);
    await page.goto('/');
    const gate = page.getByRole('dialog', { name: es ? 'Elige tu región' : 'Choose your region' });
    await expect(gate).toBeVisible();
    await fits(page);
    await gate.getByRole('button', { name: es ? 'Estados Unidos' : 'United States' }).click();
    await page.getByRole('button', { name: es ? /Usuario/ : /Individual/ }).click();
    await expect(
      page.getByRole('heading', {
        name: es ? 'Reconecta tus habilidades con Rewire.' : 'Rewire your skills.',
      }),
    ).toBeVisible();
    await fits(page);
    await page.screenshot({ animations: 'disabled', path: testInfo.outputPath('welcome.png') });
    await page.getByRole('link', { name: es ? 'Empezar' : 'Start', exact: true }).click();
    await expect(page).toHaveURL(/\/start$/);
    await expect(
      page
        .getByRole('main')
        .getByRole('link', { name: es ? 'Privacidad' : 'Privacy', exact: true }),
    ).toBeVisible();
    await fits(page);
    await page.screenshot({ animations: 'disabled', path: testInfo.outputPath('start.png') });
    const login = await page.request.post('/api/session/sign-in', {
      data: { username: 'Rewire', password: 'DemoDemoDemo', role: 'learner' },
    });
    expect(login.ok()).toBe(true);
    expect(
      (
        await page.request.put('/api/session/profile', {
          data: {
            region: 'us',
            occupation: { code: '43-3051.00', title: 'Payroll Clerk', isco08: '4313' },
            timeByTask: {},
          },
        })
      ).ok(),
    ).toBe(true);
    await page.goto('/us/report/4313');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await fits(page);
    await page.screenshot({ animations: 'disabled', path: testInfo.outputPath('report.png') });
    await page
      .getByRole('region', { name: es ? 'Tu semana' : 'Your week', exact: true })
      .screenshot({ path: testInfo.outputPath('exposure.png') });
    // Money for the courses, added through the test server's fake PayPal.
    await fundWallet(page, 10_000);
    await page.goto('/us/plan/4313');
    await findThreeCourses(page, es);
    await fits(page);
    await page.screenshot({ animations: 'disabled', path: testInfo.outputPath('plan.png') });
    await checkoutFirstCourse(page, es);
    await expect(
      page.getByRole('button', { name: es ? /con tu saldo$/ : /from your balance$/ }),
    ).toBeEnabled();
    await fits(page);
    await page.screenshot({ animations: 'disabled', path: testInfo.outputPath('checkout.png') });
    await page.goto('/dashboard?tab=wallet');
    await expect(
      page.getByRole('region', { name: es ? 'Tu monedero' : 'Your wallet' }),
    ).toBeVisible();
    await fits(page);
    await page.screenshot({ animations: 'disabled', path: testInfo.outputPath('dashboard.png') });
    await page.getByRole('button', { name: es ? 'Menú' : 'Menu' }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await fits(page);
    await page.keyboard.press('Escape');
    expect(
      (
        await page.request.post('/api/session/sign-in', {
          data: { username: 'Rewire', password: 'DemoDemoDemo', role: 'business' },
        })
      ).ok(),
    ).toBe(true);
    await page.goto('/business');
    await page.getByRole('button', { name: es ? 'Mis cursos' : 'My courses', exact: true }).click();
    await expect(
      page.getByRole('region', { name: es ? 'Catálogo de cursos' : 'Course catalogue' }),
    ).toBeVisible();
    await fits(page);
    await page.screenshot({ animations: 'disabled', path: testInfo.outputPath('business.png') });
    await page.getByRole('button', { name: es ? 'Ventas' : 'Sales', exact: true }).click();
    await expect(
      page.getByRole('heading', { name: es ? 'Ventas' : 'Sales', exact: true }),
    ).toBeVisible();
    await fits(page);
    await page.goto('/what-is-rewire');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await fits(page);
    await page.screenshot({ animations: 'disabled', path: testInfo.outputPath('method.png') });
    await page.getByRole('button', { name: es ? 'Menú' : 'Menu', exact: true }).click();
    await expect(page.getByRole('dialog').locator('nav li')).toHaveCount(8);
    await page.screenshot({ animations: 'disabled', path: testInfo.outputPath('menu.png') });
  });
}
