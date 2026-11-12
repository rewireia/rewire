import type { ExposureReport, Payment, TaskBand, TimeShare } from '@rewire/contracts';
import { describe, expect, it } from 'vitest';

import { paymentTotals } from '../src/features/dashboard/payment-totals.ts';
import { compareBands, compareShares, taskRows } from '../src/features/report/task-rows.ts';

function payment(change: Partial<Payment>): Payment {
  return {
    orderId: 'o',
    courseId: 'c',
    courseTitle: 'Course',
    method: 'paypal',
    amount: { currency: 'USD', minorUnits: 1900 },
    status: 'completed',
    createdAt: '2026-11-11T10:00:00.000Z',
    paidAt: '2026-11-11T10:00:00.000Z',
    refundedAt: null,
    paypalReference: 'CAPTURE-1',
    refundable: true,
    ...change,
  };
}

describe('the totals of "My payments"', () => {
  it('add what was paid and what was refunded, one currency at a time', () => {
    const totals = paymentTotals([
      payment({}),
      payment({ amount: { currency: 'USD', minorUnits: 5900 }, status: 'refunded' }),
      payment({ amount: { currency: 'EUR', minorUnits: 4900 } }),
      payment({ amount: { currency: 'EUR', minorUnits: 4900 }, status: 'created', paidAt: null }),
    ]);
    expect(totals).toEqual([
      {
        currency: 'USD',
        paid: { currency: 'USD', minorUnits: 7800 },
        refunded: { currency: 'USD', minorUnits: 5900 },
      },
      {
        currency: 'EUR',
        paid: { currency: 'EUR', minorUnits: 4900 },
        refunded: { currency: 'EUR', minorUnits: 0 },
      },
    ]);
  });

  it('are empty without payments', () => {
    expect(paymentTotals([])).toEqual([]);
  });
});

describe('the rows of the task table', () => {
  const task = (id: string) => ({
    id,
    text: `Task ${id};`,
    score: 0.5,
    band: 'medium' as const,
    range: { low: 0.4, high: 0.6 },
    reviewedByExperts: false,
  });

  it('carry the time given to each task, `some` when none was given', () => {
    // Only the tasks are read to build the rows.
    const report = { tasks: [task('a'), task('b')] } as unknown as ExposureReport;
    const rows = taskRows(report, { b: 'most' });
    expect(rows.map((row) => row.share)).toEqual(['some', 'most']);
  });

  it('sort bands and times by meaning, not by their words', () => {
    const bands: TaskBand[] = ['high', 'very-low', 'medium', 'low'];
    const shares: TimeShare[] = ['most', 'none', 'some', 'little'];
    expect(bands.sort(compareBands)).toEqual(['very-low', 'low', 'medium', 'high']);
    expect(shares.sort(compareShares)).toEqual(['none', 'little', 'some', 'most']);
  });
});
