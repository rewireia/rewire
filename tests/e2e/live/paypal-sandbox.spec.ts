import { expect, test, type BrowserContext, type Page } from '@playwright/test';
import { approve, signIn } from './paypal-support.ts';

const COURSES = ['ai-foundations', 'ai-for-office-work', 'checking-ai-work'] as const;
const WEB_ORIGIN = 'http://127.0.0.1:5295';
const WAIT = 90_000;
const REQUIRED = [
  'PAYPAL_CLIENT_ID',
  'PAYPAL_CLIENT_SECRET',
  'PAYPAL_SANDBOX_BUYER_EMAIL',
  'PAYPAL_SANDBOX_BUYER_PASSWORD',
] as const;
const missing = REQUIRED.filter((name) => (process.env[name] ?? '') === '');

interface PaymentLine {
  readonly orderId: string;
  readonly courseId: string;
  readonly status: string;
  readonly paypalReference: string | null;
}
interface Sale {
  readonly id: string;
  readonly courseId: string;
  readonly status: string;
}
interface MarketCourse {
  readonly courseId: string;
  readonly published: boolean;
}

async function payments(page: Page): Promise<readonly PaymentLine[]> {
  const answer = await page.request.get('/api/payments');
  expect(answer.ok()).toBe(true);
  return ((await answer.json()) as { payments: PaymentLine[] }).payments;
}

async function sales(page: Page): Promise<readonly Sale[]> {
  const answer = await page.request.get('/api/business/sales');
  expect(answer.ok()).toBe(true);
  return ((await answer.json()) as { sales: Sale[] }).sales;
}

/** Pays once through the real SDK; no test retry may repeat a successful payment. */
async function purchase(page: Page, course: string, preferPayLater: boolean): Promise<PaymentLine> {
  await page.goto(`/us/courses/${course}`);
  const config = await page.request.get('/api/regions/us/payment-config');
  const paymentConfig = (await config.json()) as { available: boolean; environment?: string };
  expect(paymentConfig.available).toBe(true);
  expect(paymentConfig.environment).toBe('sandbox');
  await expect(page.locator('paypal-button')).toBeVisible({ timeout: WAIT });
  const later = page.locator('paypal-pay-later-button');
  const offered = preferPayLater && (await later.isVisible());
  if (preferPayLater) {
    test.info().annotations.push({
      type: 'Pay Later',
      description: offered
        ? 'SDK offered Pay Later; its button was used. Financing selection is not independently verified.'
        : 'Pay Later unavailable from the SDK for this session; course purchased with standard PayPal.',
    });
  }
  const opened = page.waitForEvent('popup', { timeout: WAIT });
  await (offered ? later : page.locator('paypal-button')).click({ timeout: WAIT });
  await approve(await opened);
  await expect(page).toHaveURL(new RegExp(`/learn/${course}$`), { timeout: WAIT });
  const paid = (await payments(page)).find((line) => line.courseId === course);
  expect(paid?.status).toBe('completed');
  expect(paid?.paypalReference ?? '').not.toBe('');
  if (paid === undefined) throw new Error('The paid order was not recorded');
  return paid;
}

async function businessContext(context: BrowserContext): Promise<Page> {
  const page = await context.newPage();
  await signIn(page, 'business');
  return page;
}

test.skip(missing.length > 0, `Set ${missing.join(', ')} in .env to run the sandbox purchase.`);

test('sandbox purchases appear for learner and business; the third refund updates both', async ({
  page,
  browser,
}) => {
  await signIn(page, 'learner');
  const business = await browser.newContext({ baseURL: WEB_ORIGIN });
  try {
    const seller = await businessContext(business);
    const catalogue = await seller.request.get('/api/business/catalogue?region=us');
    expect(catalogue.ok()).toBe(true);
    const { courses } = (await catalogue.json()) as { courses: MarketCourse[] };
    expect(courses.filter((course) => course.published).length).toBeGreaterThanOrEqual(5);
    for (const id of COURSES)
      expect(courses.some((course) => course.courseId === id && course.published)).toBe(true);

    const first = await purchase(page, COURSES[0], false);
    const second = await purchase(page, COURSES[1], true);
    const third = await purchase(page, COURSES[2], false);
    const before = await sales(seller);
    for (const payment of [first, second, third]) {
      expect(before.find((sale) => sale.id === payment.orderId)?.status).toBe('completed');
    }
    const sold = new Set(before.map((sale) => sale.courseId));
    expect(
      courses.filter((course) => course.published && !sold.has(course.courseId)).length,
    ).toBeGreaterThanOrEqual(2);

    const refund = await page.request.post(`/api/payments/${third.orderId}/refund`, {
      headers: { Origin: WEB_ORIGIN },
      data: {},
    });
    expect(refund.ok()).toBe(true);
    await expect
      .poll(
        async () => {
          const status = (await payments(page)).find(
            (line) => line.orderId === third.orderId,
          )?.status;
          if (status !== 'refunded') {
            const refresh = await page.request.post(`/api/payments/${third.orderId}/refresh`, {
              headers: { Origin: WEB_ORIGIN },
              data: {},
            });
            expect(refresh.ok()).toBe(true);
          }
          return (await payments(page)).find((line) => line.orderId === third.orderId)?.status;
        },
        { timeout: WAIT },
      )
      .toBe('refunded');
    await expect
      .poll(async () => (await sales(seller)).find((sale) => sale.id === third.orderId)?.status, {
        timeout: WAIT,
      })
      .toBe('refunded');
    const learning = await page.request.get('/api/learning');
    const { enrolments } = (await learning.json()) as { enrolments: { courseId: string }[] };
    expect(enrolments.map((enrolment) => enrolment.courseId)).not.toContain(COURSES[2]);
    expect(enrolments.map((enrolment) => enrolment.courseId)).toEqual(
      expect.arrayContaining([COURSES[0], COURSES[1]]),
    );
  } finally {
    await business.close();
  }
});
