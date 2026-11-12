import { expect, type Page } from '@playwright/test';

/**
 * Adds money to the signed-in learner's wallet through the test server, whose PayPal is the fake
 * gateway: the top-up is opened and captured as the browser would after PayPal's approval.
 */
export async function fundWallet(page: Page, amountMinor: number): Promise<void> {
  const opened = await page.request.post('/api/wallet/top-ups', {
    data: { region: 'us', amountMinor },
  });
  expect(opened.status()).toBe(201);
  const { topUpId } = (await opened.json()) as { topUpId: string };
  const captured = await page.request.post(`/api/wallet/top-ups/${topUpId}/capture`, { data: {} });
  expect(((await captured.json()) as { status: string }).status).toBe('completed');
}
