import {
  startedTopUpSchema,
  TOP_UP_MAXIMUM_MINOR,
  topUpResultSchema,
  walletSchema,
  type Region,
} from '@rewire/contracts';
import { expect } from 'vitest';

import { bodyOf, type TestClient } from './client.ts';

/** Opens a top-up as the browser does before PayPal's buttons. */
export async function openTopUp(client: TestClient, amountMinor: number, region: Region = 'us') {
  return bodyOf(
    await client.post('/api/wallet/top-ups', { region, amountMinor }),
    201,
    startedTopUpSchema,
  );
}

/**
 * Adds money to the wallet of a signed-in learner end to end, through the fake PayPal: each
 * top-up is opened, approved and captured, as many as the amount needs.
 */
export async function fundWallet(client: TestClient, amountMinor: number, region: Region = 'us') {
  for (let left = amountMinor; left > 0; left -= TOP_UP_MAXIMUM_MINOR) {
    const topUp = await openTopUp(client, Math.min(left, TOP_UP_MAXIMUM_MINOR), region);
    const captured = await bodyOf(
      await client.post(`/api/wallet/top-ups/${topUp.topUpId}/capture`),
      200,
      topUpResultSchema,
    );
    expect(captured.status).toBe('completed');
  }
}

/** The wallet of the signed-in learner, as the dashboard reads it. */
export async function walletOf(client: TestClient, region: Region = 'us') {
  return bodyOf(await client.get(`/api/marketplace/wallet?region=${region}`), 200, walletSchema);
}
