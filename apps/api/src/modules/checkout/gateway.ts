import type { Money } from '@rewire/contracts';

/** What the server asks PayPal to charge. The browser never supplies any of it. */
export interface OpenOrderInput {
  /** Our order id. PayPal echoes it on the capture, and it is the idempotency key. */
  readonly orderId: string;
  readonly description: string;
  readonly amount: Money;
}

/** A refund PayPal reports done on a capture, with what it gave back. */
export interface RefundFact {
  readonly refundId: string;
  readonly amount: Money;
}

/** A payment as PayPal reported it, kept as text when Rewire cannot read it with certainty. */
export interface ObservedPayment {
  readonly status: string | undefined;
  readonly currency: string | undefined;
  readonly value: string | undefined;
}

/** How the capture of an order stands at PayPal. */
export type CaptureOutcome =
  | {
      readonly status: 'completed';
      readonly captureId: string;
      readonly amount: Money;
      /** Our order id, as PayPal echoes it. */
      readonly orderId: string | undefined;
      /** The refunds PayPal reports done on it, such as a partial one from the merchant. */
      readonly refunds: readonly RefundFact[];
    }
  | {
      /** PayPal holds the money: the seller must act, or a review is under way. */
      readonly status: 'pending';
      readonly captureId: string;
      readonly amount: Money;
      readonly orderId: string | undefined;
      readonly reason: string;
    }
  /** PayPal says it took nothing: the capture was declined or failed. */
  | { readonly status: 'failed'; readonly reason: string }
  /** The money went back to the buyer, by our refund or from the merchant's PayPal account. */
  | {
      readonly status: 'refunded';
      readonly captureId: string;
      /** What the capture took before it was given back. */
      readonly amount: Money;
      readonly orderId: string | undefined;
      readonly refunds: readonly RefundFact[];
    }
  /**
   * PayPal reported a capture Rewire cannot read with certainty: an unknown status, a currency
   * it does not sell in, or an amount or a refund it cannot read. Money may have moved, so it is
   * neither a payment nor a refusal: it is kept as received and waits for a reconciliation.
   */
  | {
      readonly status: 'review';
      readonly captureId: string | undefined;
      readonly reason: string;
      readonly observed: ObservedPayment;
    }
  /** The buyer has not approved the order, or it was never captured. */
  | { readonly status: 'not-captured' };

/**
 * How a refund stands at PayPal: `pending` until it sends the money back, `completed` once it
 * has, `failed` when PayPal declined or cancelled it, at once or after accepting it.
 */
export interface RefundOutcome {
  readonly refundId: string;
  readonly status: 'completed' | 'pending' | 'failed';
}

/**
 * The payments provider, as the checkout needs it. PayPal implements it in production
 * and a fake does in tests, so the rules of the checkout are tested without the network.
 */
export interface PaymentGateway {
  openOrder(input: OpenOrderInput): Promise<{ paypalOrderId: string }>;
  /** Captures an approved order. Safe to repeat: the same order is never charged twice. */
  captureOrder(paypalOrderId: string, orderId: string): Promise<CaptureOutcome>;
  /** Reads the order again, to settle a payment the checkout left pending. */
  readOrder(paypalOrderId: string): Promise<CaptureOutcome>;
  /**
   * Returns the whole amount of a capture. Safe to repeat under the same request id; a refund
   * asked again after PayPal declined one needs a new id.
   */
  refundCapture(captureId: string, requestId: string): Promise<RefundOutcome>;
  /** Reads a refund PayPal accepted, to learn whether it was completed or declined. */
  readRefund(refundId: string): Promise<RefundOutcome>;
}

/**
 * What a failed call left behind: `refused` when PayPal answered that it did not do it, `unknown`
 * when it may have done it without our learning so (no answer, a server error, an unreadable
 * answer).
 */
export type GatewayOutcome = 'refused' | 'unknown';

/** PayPal refused a request or could not be reached. */
export class PaymentGatewayError extends Error {
  override readonly name = 'PaymentGatewayError';
  /** PayPal's name for what went wrong, such as `ORDER_NOT_APPROVED`. */
  readonly issue: string;
  /** PayPal's id of the failed call, to quote when asking them about it. */
  readonly debugId: string | undefined;
  readonly outcome: GatewayOutcome;

  constructor(issue: string, debugId?: string, outcome: GatewayOutcome = 'refused') {
    super(`PayPal refused the request: ${issue}`);
    this.issue = issue;
    this.debugId = debugId;
    this.outcome = outcome;
  }
}
