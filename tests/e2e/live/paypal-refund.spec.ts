import { expect, test, type Page } from '@playwright/test';

import { approve, signIn } from './paypal-support.ts';

const COURSE = 'checking-ai-work';
const WEB_ORIGIN = 'http://127.0.0.1:5295';
const WAIT = 90_000;
const ENABLED = process.env['PAYPAL_SANDBOX_REFUND_LIVE'] === '1';
const REQUIRED = [
  'PAYPAL_CLIENT_ID',
  'PAYPAL_CLIENT_SECRET',
  'PAYPAL_SANDBOX_BUYER_EMAIL',
  'PAYPAL_SANDBOX_BUYER_PASSWORD',
] as const;
const missing = REQUIRED.filter((name) => (process.env[name] ?? '') === '');

interface Payment {
  readonly orderId: string;
  readonly courseId: string;
  readonly status: string;
  readonly paypalReference: string | null;
}
interface Sale {
  readonly id: string;
  readonly status: string;
}

async function payments(page: Page): Promise<readonly Payment[]> {
  const response = await page.request.get('/api/payments');
  expect(response.ok()).toBe(true);
  return ((await response.json()) as { payments: Payment[] }).payments;
}
async function sales(page: Page): Promise<readonly Sale[]> {
  const response = await page.request.get('/api/business/sales');
  expect(response.ok()).toBe(true);
  return ((await response.json()) as { sales: Sale[] }).sales;
}

async function buy(page: Page): Promise<Payment> {
  const config = await page.request.get('/api/regions/us/payment-config');
  const paymentConfig = (await config.json()) as { available: boolean; environment?: string };
  expect(paymentConfig.available).toBe(true);
  expect(paymentConfig.environment).toBe('sandbox');
  await page.goto(`/us/courses/${COURSE}`);
  const button = page.locator('paypal-button');
  await expect(button).toBeVisible({ timeout: WAIT });
  const opened = page.waitForEvent('popup', { timeout: WAIT });
  await button.click();
  await approve(await opened);
  await expect(page).toHaveURL(new RegExp(`/learn/${COURSE}$`), { timeout: WAIT });
  const paid = (await payments(page)).find((line) => line.courseId === COURSE);
  expect(paid?.status).toBe('completed');
  expect(paid?.paypalReference).toBeTruthy();
  if (!paid) throw new Error('The completed order was not recorded');
  return paid;
}

async function refund(page: Page, orderId: string): Promise<void> {
  const response = await page.request.post(`/api/payments/${orderId}/refund`, {
    headers: { Origin: WEB_ORIGIN },
    data: {},
  });
  expect(response.ok()).toBe(true);
  await expect
    .poll(
      async () => {
        const payment = (await payments(page)).find((item) => item.orderId === orderId);
        if (payment?.status !== 'refunded') {
          const refresh = await page.request.post(`/api/payments/${orderId}/refresh`, {
            headers: { Origin: WEB_ORIGIN },
            data: {},
          });
          expect(refresh.ok()).toBe(true);
        }
        return (await payments(page)).find((item) => item.orderId === orderId)?.status;
      },
      { timeout: WAIT },
    )
    .toBe('refunded');
}

test.skip(
  !ENABLED || missing.length > 0,
  'Explicitly enable the sandbox refund test and set buyer credentials.',
);

test('one sandbox payment and its refund appear in both dashboards', async ({ page, browser }) => {
  await signIn(page, 'learner');
  const business = await browser.newContext({ baseURL: WEB_ORIGIN });
  try {
    const seller = await business.newPage();
    await signIn(seller, 'business');
    const payment = await buy(page);
    expect((await sales(seller)).find((sale) => sale.id === payment.orderId)?.status).toBe(
      'completed',
    );
    await refund(page, payment.orderId);
    await expect
      .poll(async () => (await sales(seller)).find((sale) => sale.id === payment.orderId)?.status, {
        timeout: WAIT,
      })
      .toBe('refunded');
    const response = await page.request.get('/api/learning');
    expect(response.ok()).toBe(true);
    const { enrolments } = (await response.json()) as { enrolments: { courseId: string }[] };
    expect(enrolments.some((enrolment) => enrolment.courseId === COURSE)).toBe(false);
  } finally {
    await business.close();
  }
});
