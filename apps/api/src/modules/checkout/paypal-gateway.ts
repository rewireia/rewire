import {
  ApiError,
  CaptureStatus,
  CheckoutPaymentIntent,
  Client,
  Environment,
  OrdersController,
  PaymentsController,
  RefundStatus,
  type Money as PayPalMoney,
  type Order,
  type OrderRequest,
  type OrdersCapture,
  type Refund,
} from '@paypal/paypal-server-sdk';
import { currencySchema, type Currency, type Money } from '@rewire/contracts';

import type { MerchantCredentials } from '../../config.ts';

import {
  PaymentGatewayError,
  type CaptureOutcome,
  type OpenOrderInput,
  type PaymentGateway,
  type RefundFact,
  type RefundOutcome,
} from './gateway.ts';
import { fromDecimalAmount, toDecimalAmount } from './money.ts';
import { payPalErrorOf } from './paypal-error.ts';

const REQUEST_TIMEOUT_MS = 20_000;
/** Asks PayPal to answer with the whole order, not only its id and status. */
const FULL_REPRESENTATION = 'return=representation';

/**
 * PayPal as the payments provider, through its official server SDK.
 *
 * Every write carries a `PayPal-Request-Id` derived from our order id, so a request that
 * is repeated after a timeout or a retry has the effect of a single one.
 */
export function createPayPalGateway(
  merchant: MerchantCredentials,
  environment: 'sandbox' | 'live',
): PaymentGateway {
  const client = clientOf(merchant, environment);
  const orders = new OrdersController(client);
  const payments = new PaymentsController(client);

  return {
    async openOrder({ orderId, description, amount }) {
      const { result } = await asGatewayCall(() =>
        orders.createOrder({
          body: orderRequestOf({ orderId, description, amount }),
          paypalRequestId: `open-${orderId}`,
        }),
      );
      if (result.id === undefined) {
        throw new PaymentGatewayError('ORDER_WITHOUT_ID');
      }
      return { paypalOrderId: result.id };
    },

    async captureOrder(paypalOrderId, orderId) {
      try {
        const { result } = await asGatewayCall(() =>
          orders.captureOrder({
            id: paypalOrderId,
            paypalRequestId: `capture-${orderId}`,
            prefer: FULL_REPRESENTATION,
          }),
        );
        return outcomeOf(result);
      } catch (error) {
        // Captured by an earlier attempt whose answer was lost: read what happened then.
        if (error instanceof PaymentGatewayError && error.issue === 'ORDER_ALREADY_CAPTURED') {
          return this.readOrder(paypalOrderId);
        }
        throw error;
      }
    },

    async readOrder(paypalOrderId) {
      const { result } = await asGatewayCall(() => orders.getOrder({ id: paypalOrderId }));
      return outcomeOf(result);
    },

    async refundCapture(captureId, requestId): Promise<RefundOutcome> {
      const { result } = await asGatewayCall(() =>
        payments.refundCapturedPayment({ captureId, paypalRequestId: requestId }),
      );
      return refundOutcomeOf(result);
    },

    async readRefund(refundId) {
      const { result } = await asGatewayCall(() => payments.getRefund({ refundId }));
      return refundOutcomeOf(result);
    },
  };
}

/** An SDK client that signs in as the merchant. */
function clientOf(merchant: MerchantCredentials, environment: 'sandbox' | 'live'): Client {
  return new Client({
    clientCredentialsAuthCredentials: {
      oAuthClientId: merchant.clientId,
      oAuthClientSecret: merchant.clientSecret,
    },
    environment: environment === 'live' ? Environment.Production : Environment.Sandbox,
    timeout: REQUEST_TIMEOUT_MS,
  });
}

/** The order PayPal is asked to open: one purchase unit, tagged with our order id. */
function orderRequestOf({ orderId, description, amount }: OpenOrderInput): OrderRequest {
  return {
    intent: CheckoutPaymentIntent.Capture,
    purchaseUnits: [
      {
        amount: { currencyCode: amount.currency, value: toDecimalAmount(amount) },
        description,
        customId: orderId,
      },
    ],
  };
}

/** Runs a call of the SDK and turns its errors into the gateway's own. */
async function asGatewayCall<Result>(call: () => Promise<Result>): Promise<Result> {
  try {
    return await call();
  } catch (error) {
    if (error instanceof ApiError) {
      const problem = payPalErrorOf(error.result);
      throw new PaymentGatewayError(problem.issue ?? `HTTP_${error.statusCode}`, problem.debugId);
    }
    throw new PaymentGatewayError('UNREACHABLE');
  }
}

/**
 * How a refund PayPal answered stands, when it was asked or read later. One declined or cancelled
 * moved no money: it is `failed`, so it is never kept as a refund still under way.
 */
export function refundOutcomeOf(refund: Pick<Refund, 'id' | 'status'>): RefundOutcome {
  if (refund.id === undefined) {
    throw new PaymentGatewayError('REFUND_WITHOUT_ID');
  }
  switch (refund.status) {
    case RefundStatus.Completed:
      return { refundId: refund.id, status: 'completed' };
    case RefundStatus.Failed:
    case RefundStatus.Cancelled:
      return { refundId: refund.id, status: 'failed' };
    // Still under way, or a status this version of the SDK does not name: no money is known back.
    case RefundStatus.Pending:
    case undefined:
    default:
      return { refundId: refund.id, status: 'pending' };
  }
}

/** How the first capture of an order stands, as PayPal reports it, with its refunds. */
export function outcomeOf(order: Order): CaptureOutcome {
  const payments = order.purchaseUnits?.[0]?.payments;
  const capture = payments?.captures?.[0];
  return capture === undefined
    ? { status: 'not-captured' }
    : captureOutcomeOf(capture, payments?.refunds ?? []);
}

/**
 * Only a capture PayPal declined or failed is a refusal. Any other capture that cannot be read
 * whole (its id, its amount in a currency Rewire sells in, its refunds, a known status) may have
 * taken money, so it is put in review with what PayPal sent, never taken as nothing paid.
 */
function captureOutcomeOf(capture: OrdersCapture, refunds: readonly Refund[]): CaptureOutcome {
  const { status } = capture;
  if (status === CaptureStatus.Declined || status === CaptureStatus.Failed) {
    return { status: 'failed', reason: status };
  }
  const observed = {
    status,
    currency: capture.amount?.currencyCode,
    value: capture.amount?.value,
  };
  const amount = moneyOf(capture.amount);
  const done = amount === undefined ? undefined : refundsOf(refunds, amount.currency);
  if (capture.id === undefined || amount === undefined || done === undefined) {
    return { status: 'review', captureId: capture.id, reason: 'UNREADABLE_CAPTURE', observed };
  }
  const settled = { captureId: capture.id, amount, orderId: capture.customId };
  switch (status) {
    // Rewire refunds only in full. A partial refund can only come from the merchant's own
    // PayPal account: it is recorded, and the learner keeps the course.
    case CaptureStatus.Completed:
    case CaptureStatus.PartiallyRefunded:
      return { status: 'completed', ...settled, refunds: done };
    case CaptureStatus.Pending:
      return { status: 'pending', ...settled, reason: capture.statusDetails?.reason ?? 'PENDING' };
    case CaptureStatus.Refunded:
      return { status: 'refunded', ...settled, refunds: done };
    // No status, or one this version of the SDK does not name.
    case undefined:
    default:
      return { status: 'review', captureId: capture.id, reason: 'UNKNOWN_STATUS', observed };
  }
}

/** An amount PayPal wrote, in a currency Rewire sells in, or `undefined`. */
function moneyOf(money: PayPalMoney | undefined): Money | undefined {
  const currency = currencySchema.safeParse(money?.currencyCode);
  return currency.success ? fromDecimalAmount(money?.value ?? '', currency.data) : undefined;
}

/**
 * The refunds PayPal reports done, each with its id and amount in the capture's currency. One
 * still pending or declined gave nothing back. `undefined` when a done refund cannot be read.
 */
function refundsOf(refunds: readonly Refund[], currency: Currency): RefundFact[] | undefined {
  const done: RefundFact[] = [];
  for (const refund of refunds.filter(({ status }) => status === RefundStatus.Completed)) {
    const amount = moneyOf(refund.amount);
    if (refund.id === undefined || amount?.currency !== currency) {
      return undefined;
    }
    done.push({ refundId: refund.id, amount });
  }
  return done;
}
