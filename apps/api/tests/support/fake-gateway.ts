import type { Money } from '@rewire/contracts';

import {
  PaymentGatewayError,
  type CaptureOutcome,
  type PaymentGateway,
} from '../../src/modules/checkout/gateway.ts';

/**
 * How the fake PayPal answers the next capture of an order. `unreadable`: PayPal took the money
 * but reports it in a way the adapter cannot read, such as a currency Rewire does not sell in.
 */
type CaptureScript =
  'completed' | 'pending' | 'mismatch' | 'unreadable' | 'declined' | 'not-approved';

interface FakeRefund {
  readonly id: string;
  /** The idempotency key it was asked under, if Rewire asked for it. */
  readonly requestId: string | undefined;
  status: 'pending' | 'completed' | 'failed';
  readonly amount: Money;
}

interface Capture {
  readonly id: string;
  status: 'completed' | 'pending' | 'refunded' | 'unreadable';
  readonly amount: Money;
  readonly refunds: FakeRefund[];
}

interface FakeOrder {
  readonly orderId: string;
  readonly amount: Money;
  script: CaptureScript;
  capture: Capture | undefined;
}

/** PayPal in memory: it keeps the orders it opened and answers as it is told to. */
export interface FakeGateway extends PaymentGateway {
  /** Sets how the next capture of an order is answered. By default it completes. */
  scriptCapture(paypalOrderId: string, script: CaptureScript): void;
  /** The buyer paid and PayPal captured, without the checkout hearing about it. */
  captureAtPayPal(paypalOrderId: string): string;
  /**
   * PayPal finishes reviewing a held payment, or reports clearly a capture it reported in a way
   * Rewire could not read: the capture is now completed.
   */
  release(paypalOrderId: string): void;
  /** The next read of an order fails, as if PayPal could not be reached. */
  failNextRead(): void;
  /**
   * The answer to the next capture never comes back. With `captured`, PayPal did capture the
   * money; without, the request never reached it.
   */
  loseNextCapture(captured: boolean): void;
  /** Refunds are answered as `pending` from now on: PayPal has not sent the money back yet. */
  holdRefunds(): void;
  /** The next refund fails, as if PayPal could not be reached. */
  failNextRefund(): void;
  /** Refunds are declined at once from now on, as PayPal may answer `FAILED`. */
  declineRefunds(): void;
  /** PayPal finishes a refund it held, or the merchant refunds from their PayPal account. */
  refundAtPayPal(paypalOrderId: string): void;
  /** PayPal declines a refund it had accepted: the capture stays completed. */
  declineRefundAtPayPal(refundId: string): void;
  /** The merchant gives back part of a capture from their PayPal account. Returns its id. */
  refundPartAtPayPal(paypalOrderId: string, minorUnits: number): string;
  /** The idempotency keys of the refunds Rewire asked for, in order. */
  readonly refundRequests: string[];
  /** What the buyer reads at PayPal for each order opened, in order. */
  readonly descriptions: string[];
  readonly calls: {
    opened: number;
    captured: number;
    read: number;
    refunded: number;
    refundsRead: number;
  };
}

export function createFakeGateway(): FakeGateway {
  const orders = new Map<string, FakeOrder>();
  const calls = { opened: 0, captured: 0, read: 0, refunded: 0, refundsRead: 0 };
  const refundRequests: string[] = [];
  const descriptions: string[] = [];
  let readFails = false;
  let refundsHeld = false;
  let refundsDeclined = false;
  let refundFails = false;
  let lostCapture: { captured: boolean } | undefined;

  const orderAt = (paypalOrderId: string): FakeOrder => {
    const order = orders.get(paypalOrderId);
    if (order === undefined) {
      throw new PaymentGatewayError('RESOURCE_NOT_FOUND');
    }
    return order;
  };
  const capture = (order: FakeOrder, status: Capture['status'], amount = order.amount) => {
    const id = `CAPTURE-${orders.size}-${order.orderId.slice(0, 8)}`;
    order.capture = { id, status, amount, refunds: [] };
    return order.capture;
  };
  const refundOf = (refundId: string): FakeRefund => {
    const refund = [...orders.values()]
      .flatMap((order) => order.capture?.refunds ?? [])
      .find((candidate) => candidate.id === refundId);
    if (refund === undefined) {
      throw new PaymentGatewayError('RESOURCE_NOT_FOUND');
    }
    return refund;
  };

  return {
    calls,
    async openOrder({ orderId, amount, description }) {
      calls.opened += 1;
      descriptions.push(description);
      const paypalOrderId = `PAYPAL-${orders.size + 1}`;
      orders.set(paypalOrderId, { orderId, amount, script: 'completed', capture: undefined });
      return Promise.resolve({ paypalOrderId });
    },
    async captureOrder(paypalOrderId) {
      calls.captured += 1;
      const order = orderAt(paypalOrderId);
      const lost = lostCapture;
      lostCapture = undefined;
      // PayPal answers a repeated capture with the capture already made.
      if (order.capture === undefined && lost?.captured !== false) {
        scripted(order, capture);
      }
      if (lost !== undefined) {
        throw new PaymentGatewayError('UNREACHABLE', undefined, 'unknown');
      }
      return Promise.resolve(outcomeOf(order));
    },
    async readOrder(paypalOrderId) {
      calls.read += 1;
      if (readFails) {
        readFails = false;
        throw new PaymentGatewayError('UNREACHABLE');
      }
      return Promise.resolve(outcomeOf(orderAt(paypalOrderId)));
    },
    async refundCapture(captureId, requestId) {
      calls.refunded += 1;
      if (refundFails) {
        refundFails = false;
        throw new PaymentGatewayError('UNREACHABLE', undefined, 'unknown');
      }
      const captured = [...orders.values()].find(
        (order) => order.capture?.id === captureId,
      )?.capture;
      if (captured === undefined) {
        throw new PaymentGatewayError('RESOURCE_NOT_FOUND');
      }
      refundRequests.push(requestId);
      // PayPal answers a repeated request with the refund it made under that key.
      const asked = captured.refunds.find((refund) => refund.requestId === requestId);
      const refund = asked ?? newRefund(captured, requestId, refundsDeclined, refundsHeld);
      return Promise.resolve({ refundId: refund.id, status: refund.status });
    },
    async readRefund(refundId) {
      calls.refundsRead += 1;
      const { id, status } = refundOf(refundId);
      return Promise.resolve({ refundId: id, status });
    },
    scriptCapture(paypalOrderId, script) {
      orderAt(paypalOrderId).script = script;
    },
    captureAtPayPal(paypalOrderId) {
      return capture(orderAt(paypalOrderId), 'completed').id;
    },
    release(paypalOrderId) {
      const held = orderAt(paypalOrderId).capture;
      if (held !== undefined) {
        held.status = 'completed';
      }
    },
    failNextRead() {
      readFails = true;
    },
    loseNextCapture(captured) {
      lostCapture = { captured };
    },
    holdRefunds() {
      refundsHeld = true;
    },
    declineRefunds() {
      refundsDeclined = true;
    },
    failNextRefund() {
      refundFails = true;
    },
    refundAtPayPal(paypalOrderId) {
      const captured = orderAt(paypalOrderId).capture;
      if (captured === undefined) {
        return;
      }
      captured.status = 'refunded';
      for (const refund of captured.refunds.filter(({ status }) => status === 'pending')) {
        refund.status = 'completed';
      }
    },
    declineRefundAtPayPal(refundId) {
      refundOf(refundId).status = 'failed';
    },
    refundPartAtPayPal(paypalOrderId, minorUnits) {
      const captured = orderAt(paypalOrderId).capture;
      if (captured === undefined) {
        throw new Error(`no capture of ${paypalOrderId}`);
      }
      const id = `REFUND-PART-${captured.refunds.length + 1}-${captured.id}`;
      const amount = { ...captured.amount, minorUnits };
      captured.refunds.push({ id, requestId: undefined, status: 'completed', amount });
      return id;
    },
    refundRequests,
    descriptions,
  };
}

/** A refund of the whole capture, made at once unless PayPal holds or declines it. */
function newRefund(
  captured: Capture,
  requestId: string,
  declined: boolean,
  held: boolean,
): FakeRefund {
  const id = `REFUND-${captured.refunds.length + 1}-${captured.id}`;
  const status = declined ? 'failed' : held ? 'pending' : 'completed';
  const refund: FakeRefund = { id, requestId, status, amount: captured.amount };
  captured.refunds.push(refund);
  if (status === 'completed') {
    captured.status = 'refunded';
  }
  return refund;
}

function scripted(
  order: FakeOrder,
  capture: (order: FakeOrder, status: Capture['status'], amount?: Money) => Capture,
): void {
  switch (order.script) {
    case 'completed':
      capture(order, 'completed');
      return;
    case 'pending':
      capture(order, 'pending');
      return;
    case 'mismatch':
      capture(order, 'completed', { ...order.amount, minorUnits: order.amount.minorUnits - 100 });
      return;
    case 'unreadable':
      capture(order, 'unreadable');
      return;
    case 'declined':
      throw new PaymentGatewayError('INSTRUMENT_DECLINED');
    case 'not-approved':
      throw new PaymentGatewayError('ORDER_NOT_APPROVED');
  }
}

function outcomeOf(order: FakeOrder): CaptureOutcome {
  const { capture } = order;
  if (capture === undefined) {
    return { status: 'not-captured' };
  }
  const settled = { captureId: capture.id, amount: capture.amount, orderId: order.orderId };
  const refunds = capture.refunds
    .filter(({ status }) => status === 'completed')
    .map(({ id, amount }) => ({ refundId: id, amount }));
  switch (capture.status) {
    case 'completed':
      return { status: 'completed', ...settled, refunds };
    case 'pending':
      return { status: 'pending', ...settled, reason: 'PENDING_REVIEW' };
    case 'refunded':
      return { status: 'refunded', ...settled, refunds };
    case 'unreadable':
      return {
        status: 'review',
        captureId: capture.id,
        reason: 'UNREADABLE_CAPTURE',
        observed: { status: 'COMPLETED', currency: 'JPY', value: '100' },
      };
  }
}
