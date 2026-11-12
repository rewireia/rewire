import {
  CaptureStatus,
  RefundStatus,
  type Order,
  type OrdersCapture,
  type Refund,
} from '@paypal/paypal-server-sdk';
import { describe, expect, it } from 'vitest';

import { payPalErrorOf } from '../src/modules/checkout/paypal-error.ts';
import { outcomeOf, refundOutcomeOf } from '../src/modules/checkout/paypal-gateway.ts';

const USD_19 = { currencyCode: 'USD', value: '19.00' };

const orderWith = (status: CaptureStatus): Order => ({
  purchaseUnits: [
    {
      payments: {
        captures: [
          {
            id: 'CAPTURE-1',
            status,
            customId: 'order-1',
            amount: { currencyCode: 'USD', value: '49.00' },
          },
        ],
      },
    },
  ],
});

describe('a capture read from PayPal', () => {
  it.each([
    [CaptureStatus.Completed, 'completed'],
    // Rewire refunds only in full: a partial refund from the merchant keeps the course paid.
    [CaptureStatus.PartiallyRefunded, 'completed'],
    [CaptureStatus.Pending, 'pending'],
    [CaptureStatus.Refunded, 'refunded'],
    [CaptureStatus.Declined, 'failed'],
    [CaptureStatus.Failed, 'failed'],
  ])('with status %s counts as %s', (status, expected) => {
    expect(outcomeOf(orderWith(status)).status).toBe(expected);
  });

  it('keeps the amount and our order id of a completed capture', () => {
    expect(outcomeOf(orderWith(CaptureStatus.Completed))).toEqual({
      status: 'completed',
      captureId: 'CAPTURE-1',
      amount: { currency: 'USD', minorUnits: 4900 },
      orderId: 'order-1',
      refunds: [],
    });
  });

  it('is not captured when the order has no capture', () => {
    expect(outcomeOf({ purchaseUnits: [{}] })).toEqual({ status: 'not-captured' });
  });
});

/** An order whose only capture is the one given, with the refunds given. */
const orderOf = (capture: OrdersCapture, refunds: Refund[] = []): Order => ({
  purchaseUnits: [{ payments: { captures: [capture], refunds } }],
});

describe('a capture PayPal reports that cannot be read with certainty', () => {
  const completed = { id: 'CAPTURE-1', status: CaptureStatus.Completed };
  // A status this version of the SDK does not name reaches the adapter as it was sent.
  const settling = { ...completed, amount: USD_19, status: 'SETTLING' } as unknown as OrdersCapture;
  const captures: [string, OrdersCapture][] = [
    ['with no amount', completed],
    [
      'in a currency Rewire does not sell in',
      { ...completed, amount: { currencyCode: 'JPY', value: '100' } },
    ],
    [
      'with an amount it cannot read',
      { ...completed, amount: { currencyCode: 'USD', value: '19.0.0' } },
    ],
    ['with a status it does not know', settling],
    ['with no status', { id: 'CAPTURE-1', amount: USD_19 }],
  ];
  // Any of these may have taken money: none is a refusal, and none releases the course.
  it.each(captures)('%s is put in review, with its id and what PayPal sent', (_, capture) => {
    const outcome = outcomeOf(orderOf(capture));
    expect(outcome).toMatchObject({ status: 'review', captureId: 'CAPTURE-1' });
    expect(outcome.status === 'review' && outcome.observed).toEqual({
      status: capture.status,
      currency: capture.amount?.currencyCode,
      value: capture.amount?.value,
    });
  });

  it('with no id is put in review all the same, as money may have moved', () => {
    expect(outcomeOf(orderOf({ status: CaptureStatus.Completed, amount: USD_19 }))).toEqual({
      status: 'review',
      captureId: undefined,
      reason: 'UNREADABLE_CAPTURE',
      observed: { status: 'COMPLETED', currency: 'USD', value: '19.00' },
    });
  });

  it('with a refund done that cannot be read is put in review', () => {
    const refund = {
      id: 'REFUND-1',
      status: RefundStatus.Completed,
      amount: { currencyCode: 'EUR', value: '1.00' },
    };
    expect(outcomeOf(orderOf({ ...completed, amount: USD_19 }, [refund])).status).toBe('review');
  });

  it.each([CaptureStatus.Declined, CaptureStatus.Failed])(
    'is refused only when PayPal says %s, whatever else it cannot read',
    (status) => {
      expect(outcomeOf(orderOf({ status }))).toEqual({ status: 'failed', reason: status });
    },
  );
});

describe('the refunds of a capture read from PayPal', () => {
  const refundsOf = [
    { id: 'R-1', status: RefundStatus.Completed, amount: { currencyCode: 'USD', value: '5.00' } },
    { id: 'R-2', status: RefundStatus.Pending, amount: { currencyCode: 'USD', value: '3.00' } },
    { id: 'R-3', status: RefundStatus.Failed, amount: { currencyCode: 'USD', value: '2.00' } },
  ];

  it('are the ones done, each with its id and amount, on a capture partly refunded', () => {
    const capture = { id: 'CAPTURE-1', status: CaptureStatus.PartiallyRefunded, amount: USD_19 };
    expect(outcomeOf(orderOf(capture, refundsOf))).toMatchObject({
      status: 'completed',
      refunds: [{ refundId: 'R-1', amount: { currency: 'USD', minorUnits: 500 } }],
    });
  });

  it('come with what a refunded capture took, so a capture seen first refunded is recorded', () => {
    const capture = { id: 'CAPTURE-1', status: CaptureStatus.Refunded, amount: USD_19 };
    expect(outcomeOf(orderOf(capture, refundsOf))).toEqual({
      status: 'refunded',
      captureId: 'CAPTURE-1',
      amount: { currency: 'USD', minorUnits: 1900 },
      orderId: undefined,
      refunds: [{ refundId: 'R-1', amount: { currency: 'USD', minorUnits: 500 } }],
    });
  });
});

describe('a refund PayPal answered', () => {
  // A refund declined or cancelled, at once or later, moved no money: it is `failed`, never kept
  // as under way, and the order records it so that the next request has a key of its own.
  it.each([
    [RefundStatus.Completed, 'completed'],
    [RefundStatus.Pending, 'pending'],
    [RefundStatus.Failed, 'failed'],
    [RefundStatus.Cancelled, 'failed'],
  ])('with status %s counts as %s', (status, expected) => {
    expect(refundOutcomeOf({ id: 'REFUND-1', status })).toEqual({
      refundId: 'REFUND-1',
      status: expected,
    });
  });

  it('without an id is refused', () => {
    expect(() => refundOutcomeOf({ status: RefundStatus.Completed })).toThrow(
      expect.objectContaining({ issue: 'REFUND_WITHOUT_ID' }),
    );
  });
});

describe("PayPal's error body", () => {
  it('names the first detail, or else the error, with its debug id', () => {
    expect(
      payPalErrorOf({ name: 'UNPROCESSABLE_ENTITY', debug_id: 'd1', details: [{ issue: 'X' }] }),
    ).toEqual({ issue: 'X', debugId: 'd1' });
    expect(payPalErrorOf({ name: 'INTERNAL_SERVER_ERROR' })).toEqual({
      issue: 'INTERNAL_SERVER_ERROR',
      debugId: undefined,
    });
  });

  it('reads nothing from a body of another shape', () => {
    for (const body of [undefined, 'text', 42, { name: 7, details: 'x', debug_id: [] }]) {
      expect(payPalErrorOf(body)).toEqual({ issue: undefined, debugId: undefined });
    }
  });

  it('skips a detail it cannot read', () => {
    expect(payPalErrorOf({ name: 'N', details: [{ issue: 3 }] })).toEqual({
      issue: 'N',
      debugId: undefined,
    });
  });
});
