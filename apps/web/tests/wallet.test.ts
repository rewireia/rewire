import { describe, expect, it } from 'vitest';

import { captureOutcome } from '../src/features/checkout/capture-outcome.ts';
import { topUpAmountOf } from '../src/features/marketplace/top-up-amount.ts';
import { RISE_MS, riseAt } from '../src/features/marketplace/wallet-motion.ts';

describe('the amount of a top-up', () => {
  it('reads what the person typed, in minor units, with a point or a comma', () => {
    expect(topUpAmountOf('25')).toBe(2500);
    expect(topUpAmountOf(' 12.5 ')).toBe(1250);
    expect(topUpAmountOf('12,05')).toBe(1205);
    expect(topUpAmountOf('500')).toBe(50_000);
    expect(topUpAmountOf('5')).toBe(500);
  });

  it('refuses what the wallet does not take', () => {
    for (const typed of ['', '4.99', '500.01', '1000', '12.345', '-10', 'ten', '1e3']) {
      expect(topUpAmountOf(typed)).toBeNull();
    }
  });
});

describe('the rise of the balance', () => {
  it('goes from the old balance to the new one once, and stops there', () => {
    expect(riseAt(1000, 6000, 0)).toBe(1000);
    const half = riseAt(1000, 6000, RISE_MS / 2);
    expect(half).toBeGreaterThan(3500);
    expect(half).toBeLessThan(6000);
    expect(riseAt(1000, 6000, RISE_MS)).toBe(6000);
    expect(riseAt(1000, 6000, RISE_MS * 3)).toBe(6000);
  });

  it('lasts no more than 1.2 seconds', () => {
    expect(RISE_MS).toBeLessThanOrEqual(1200);
  });
});

describe('the outcome of a top-up', () => {
  it('is told as a payment is, with a capture that did not match as a mismatch', () => {
    expect(captureOutcome({ status: 'completed', issue: null })).toBe('completed');
    expect(captureOutcome({ status: 'pending', issue: 'held-by-paypal' })).toBe('held');
    expect(captureOutcome({ status: 'pending', issue: 'needs-review' })).toBe('review');
    expect(captureOutcome({ status: 'mismatched', issue: null })).toBe('mismatch');
    expect(captureOutcome({ status: 'refunded', issue: 'mismatch' })).toBe('mismatch');
    expect(captureOutcome({ status: 'failed', issue: 'declined' })).toBe('failed');
    expect(captureOutcome({ status: 'created', issue: 'not-approved' })).toBe('not-approved');
  });
});
