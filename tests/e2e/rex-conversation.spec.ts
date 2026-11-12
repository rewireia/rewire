import { interpretResultSchema } from '@rewire/contracts';
import { expect, test, type Page } from './support/test.ts';

const INTERPRET = '/occupations/interpret';
const labels = {
  en: {
    input: 'What do you do at work?',
    switchTo: 'Español',
  },
  es: {
    input: '¿A qué te dedicas?',
    switchTo: 'English',
  },
} as const;

async function sendMessage(page: Page, label: string, text: string) {
  const response = page.waitForResponse(
    (item) => item.url().includes(INTERPRET) && item.request().method() === 'POST',
  );
  const composer = page.getByRole('textbox', { name: label });
  await composer.fill(text);
  await composer.press('Enter');
  return response;
}

test('a workplace description gives official candidates on first Enter and accepts an optional clarification', async ({
  page,
}) => {
  await page.goto('/start');
  const firstResponse = await sendMessage(page, labels.en.input, 'trabajo en una pizzería');
  expect(firstResponse.ok()).toBe(true);
  const first = interpretResultSchema.parse(await firstResponse.json());
  expect(first.matches.some((match) => match.unitGroup?.isco08 === '9411')).toBe(true);
  expect(first.matches.some((match) => match.unitGroup?.isco08 === '5131')).toBe(true);
  await expect(
    page.getByRole('heading', {
      name: 'Do you prepare food, serve customers, deliver orders, or do something else?',
    }),
  ).toBeVisible();
  const refinedResponse = await sendMessage(page, labels.en.input, 'pizza maker');
  const sent = refinedResponse.request().postDataJSON() as { text: string };
  expect(sent.text).toContain('trabajo en una pizzería');
  expect(sent.text).toContain('pizza maker');
  const refined = interpretResultSchema.parse(await refinedResponse.json());
  const candidate = refined.matches.find((match) => match.unitGroup?.scored);
  expect(candidate).toBeDefined();
  if (!candidate?.unitGroup) throw new Error('No scored official candidate');
  const title = candidate.occupation.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  await page
    .getByRole('button', { name: new RegExp(title, 'i') })
    .last()
    .click();
  await expect(
    page.getByRole('heading', { name: 'Which tasks are part of your work?' }),
  ).toBeVisible();
  await page
    .locator('main li')
    .filter({ has: page.getByRole('checkbox') })
    .first()
    .getByRole('checkbox')
    .check();
  await page.getByRole('button', { name: 'See my report' }).click();
  await expect(page).toHaveURL(new RegExp(`/report/${candidate.unitGroup.isco08}`));
});

for (const language of ['en', 'es'] as const) {
  test(`panadera finds the same baker in ${language} and keeps the conversation when language changes`, async ({
    page,
  }) => {
    await page.addInitScript((initialLanguage) => {
      localStorage.setItem(
        'rewire.preferences',
        JSON.stringify({ language: initialLanguage, region: 'us' }),
      );
    }, language);
    let requests = 0;
    page.on('request', (request) => {
      if (request.url().includes(INTERPRET) && request.method() === 'POST') requests += 1;
    });
    await page.goto('/start');
    const response = await sendMessage(page, labels[language].input, 'panadera');
    const sent = response.request().postDataJSON() as { lang: string };
    expect(sent.lang).toBe(language);
    const result = interpretResultSchema.parse(await response.json());
    expect(result.matches[0]?.unitGroup?.isco08).toBe('7512');
    const baker = page.getByRole('button', { name: /baker/i }).first();
    await expect(baker).toBeVisible();
    const title = await baker.textContent();
    await page
      .getByRole('textbox', { name: labels[language].input })
      .fill('Draft kept across languages');
    await page.getByRole('radio', { name: labels[language].switchTo }).check();
    const next = language === 'en' ? 'es' : 'en';
    await expect(page.getByRole('textbox', { name: labels[next].input })).toHaveValue(
      'Draft kept across languages',
    );
    await expect(page.getByText('panadera', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: /baker/i }).first()).toHaveText(title ?? '');
    expect(requests).toBe(1);
  });
}

test('Enter sends once, Shift+Enter inserts a newline, and an IME Enter does not send', async ({
  page,
}) => {
  let requests = 0;
  page.on('request', (request) => {
    if (request.url().includes(INTERPRET) && request.method() === 'POST') requests += 1;
  });
  await page.goto('/start');
  const composer = page.getByRole('textbox', { name: labels.en.input });
  await composer.fill('panadera');
  await composer.dispatchEvent('keydown', {
    key: 'Enter',
    code: 'Enter',
    isComposing: true,
    bubbles: true,
  });
  await expect(composer).toHaveValue('panadera');
  expect(requests).toBe(0);
  await composer.press('Shift+Enter');
  await expect(composer).toHaveValue('panadera\n');
  expect(requests).toBe(0);
  const response = page.waitForResponse(
    (item) => item.url().includes(INTERPRET) && item.request().method() === 'POST',
  );
  await composer.press('Enter');
  expect((await response).ok()).toBe(true);
  await expect(page.getByRole('button', { name: /baker/i }).first()).toBeVisible();
  expect(requests).toBe(1);
});

test('a greeting stays conversational and does not contaminate the next job search', async ({
  page,
}) => {
  let requests = 0;
  page.on('request', (request) => {
    if (request.url().includes(INTERPRET) && request.method() === 'POST') requests += 1;
  });
  await page.goto('/start');
  const composer = page.getByRole('textbox', { name: labels.en.input });
  await composer.fill('Hola');
  await composer.press('Enter');
  await expect(page.getByText('Hello! What do you do for work?', { exact: true })).toBeVisible();
  expect(requests).toBe(0);
  await expect(
    page.getByRole('complementary', { name: 'Your journey' }).locator('[aria-current="step"]'),
  ).toContainText('Your work');
  const response = await sendMessage(page, labels.en.input, 'panadera');
  expect((response.request().postDataJSON() as { text: string }).text).toBe('panadera');
  const result = interpretResultSchema.parse(await response.json());
  expect(result.matches[0]?.unitGroup?.isco08).toBe('7512');
  await expect(page.getByRole('button', { name: /baker/i }).first()).toBeVisible();
  expect(requests).toBe(1);
});

test('a greeting combined with a job is interpreted rather than swallowed', async ({ page }) => {
  await page.goto('/start');
  const response = await sendMessage(page, labels.en.input, 'Hola, soy panadera');
  expect((response.request().postDataJSON() as { text: string }).text).toBe('Hola, soy panadera');
  const result = interpretResultSchema.parse(await response.json());
  expect(result.matches.some((match) => match.unitGroup?.isco08 === '7512')).toBe(true);
  await expect(page.getByRole('button', { name: /baker/i }).first()).toBeVisible();
});

test('a question without candidates remains visible and can be answered', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('rewire.preferences', JSON.stringify({ language: 'es', region: 'us' }));
  });
  await page.goto('/start');
  const response = await sendMessage(page, labels.es.input, 'mi trabajo es xyzzy');
  const result = interpretResultSchema.parse(await response.json());
  expect(result.matches).toEqual([]);
  expect(result.note).toBe('¿Qué tareas realizas?');
  await expect(page.getByRole('heading', { name: '¿Qué tareas realizas?' })).toBeVisible();
  await expect(page.getByRole('textbox', { name: labels.es.input })).toBeEnabled();
});
