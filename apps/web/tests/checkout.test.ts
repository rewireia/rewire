import type { CaptureResult } from '@rewire/contracts';
import { describe, expect, it } from 'vitest';

import { captureOutcome } from '../src/features/checkout/capture-outcome.ts';
import { payLaterOffers } from '../src/features/plan/pay-later.ts';

const capture = (
  status: CaptureResult['status'],
  issue: CaptureResult['issue'],
): CaptureResult => ({
  orderId: 'order-1',
  courseId: 'ai-foundations',
  status,
  issue,
});

describe('capture outcome', () => {
  it('opens the course only when the capture is completed', () => {
    expect(captureOutcome(capture('completed', null))).toBe('completed');
    expect(captureOutcome(capture('pending', 'held-by-paypal'))).toBe('held');
    expect(captureOutcome(capture('pending', 'not-approved'))).toBe('not-approved');
    expect(captureOutcome(capture('created', null))).toBe('not-approved');
    expect(captureOutcome(capture('failed', 'declined'))).toBe('failed');
    expect(captureOutcome(capture('refunded', null))).toBe('refunded');
  });

  it('reports a mismatch whatever the status', () => {
    expect(captureOutcome(capture('failed', 'mismatch'))).toBe('mismatch');
  });
});

describe('pay-later offers', () => {
  const join = (products: string, country: string) => `${products} in ${country}`;

  it('groups the products of each country', () => {
    const hints = [
      { country: 'US', product: 'Pay in 4' },
      { country: 'US', product: 'Pay Monthly' },
    ];
    expect(payLaterOffers(hints, 'en', join)).toBe('Pay in 4 and Pay Monthly in the US');
  });

  it('lists several countries', () => {
    const hints = [
      { country: 'ES', product: 'Pay in 3' },
      { country: 'FR', product: 'Pay in 4X' },
    ];
    expect(payLaterOffers(hints, 'es', (products, country) => `${products} en ${country}`)).toBe(
      'Pay in 3 en España y Pay in 4X en Francia',
    );
  });

  it('says nothing when PayPal documents nothing for the price', () => {
    expect(payLaterOffers([], 'en', join)).toBeNull();
  });
});
