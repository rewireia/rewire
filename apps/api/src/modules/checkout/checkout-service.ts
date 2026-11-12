import { DEMO_SELLER, findSellableCourse, REGION_PROFILES } from '@rewire/content';
import type {
  CaptureResult,
  Payment,
  PaymentConfig,
  PaymentRefund,
  PaymentList,
  Region,
  StartedOrder,
  StartOrderRequest,
} from '@rewire/contracts';

import type { PaymentsConfig } from '../../config.ts';
import { HttpProblem, notFound } from '../../http/problem.ts';
import type { Logger } from '../../logger.ts';
import type { Clock } from '../../platform/clock.ts';
import type { Marketplace } from '../marketplace/service.ts';
import type { EnrolmentStore } from '../learning/enrolment-store.ts';

import { openBasket, claimBasket } from './basket.ts';
import { PaymentGatewayError, type PaymentGateway } from './gateway.ts';
import { asProblem, gatewayFinder, withGateway } from './gateway-problems.ts';
import { orderDescription } from './order-description.ts';
import type { Order, OrderStore, SettlementSource } from './order-store.ts';
import { assertCanBuy, type HeldAttempt, type SettleAttempt } from './purchase-guards.ts';
import { isRefundable, REFUND_WINDOW_DAYS } from './refund-policy.ts';
import { requestRefund, settleRefund } from './refunds.ts';
import { createSettle, resultOf, type Settle } from './settlement.ts';

export interface CheckoutDependencies {
  readonly marketplace?: Marketplace;
  readonly payments: PaymentsConfig;
  /** The gateway of the merchant that sells in each region; none where PayPal is not set up. */
  readonly gateways: Readonly<Partial<Record<Region, PaymentGateway>>>;
  readonly orders: OrderStore;
  readonly enrolments: EnrolmentStore;
  /** Settles an invoice that holds a course and may have been left unanswered. */
  readonly settleInvoiceAttempt: SettleAttempt;
  readonly clock: Clock;
  readonly logger: Logger;
}

/**
 * Buying a course with PayPal.
 *
 * The server decides the price, opens the order, captures it and checks that what PayPal
 * captured is what it asked for. Access is given only for a completed capture.
 */
export interface CheckoutService {
  paymentConfig(region: Region): PaymentConfig;
  startOrder(learnerId: string, request: StartOrderRequest): Promise<StartedOrder>;
  captureOrder(learnerId: string, orderId: string): Promise<CaptureResult>;
  /** Reads the order again at PayPal and records what it finds. Changes nothing if settled. */
  reconcile(order: Order, source: SettlementSource): Promise<CaptureResult>;
  refund(learnerId: string, orderId: string): Promise<CaptureResult>;
  listPayments(learnerId: string): Promise<PaymentList>;
  /** An order of the learner, or a 404: other learners' orders do not exist for them. */
  orderOf(learnerId: string, orderId: string): Promise<Order>;
  /**
   * Reads at PayPal a PayPal order whose capture has held its course long enough to have been
   * answered, records what PayPal says, and lets the course go if it was never captured.
   */
  settleAttempt: SettleAttempt;
}

/** What every step of the checkout shares. */
interface CheckoutParts extends CheckoutDependencies {
  readonly gatewayOf: (region: Region) => PaymentGateway;
  readonly settle: Settle;
  readonly orderOf: CheckoutService['orderOf'];
  readonly settleAttempt: SettleAttempt;
}

export function createCheckoutService(dependencies: CheckoutDependencies): CheckoutService {
  const { orders } = dependencies;
  const parts: CheckoutParts = {
    ...dependencies,
    settleAttempt: (attempt) =>
      attempt.order.method === 'paypal'
        ? settlePayPalAttempt(parts, attempt)
        : dependencies.settleInvoiceAttempt(attempt),
    gatewayOf: gatewayFinder(dependencies.gateways),
    settle: createSettle(orders, gatewayFinder(dependencies.gateways), dependencies.logger),
    async orderOf(learnerId, orderId) {
      const order = await orders.find(orderId);
      if (order?.learnerId !== learnerId) {
        throw notFound('That order');
      }
      return order;
    },
  };
  return {
    paymentConfig: (region) => paymentConfigOf(dependencies.payments, region),
    startOrder: (learnerId, request) => startOrder(parts, learnerId, request),
    captureOrder: (learnerId, orderId) => captureOrder(parts, learnerId, orderId),
    reconcile: (order, source) => reconcile(parts, order, source),
    refund: (learnerId, orderId) => requestRefund(parts, learnerId, orderId),
    listPayments: (learnerId) => listPayments(parts, learnerId),
    orderOf: parts.orderOf,
    settleAttempt: (attempt) => settlePayPalAttempt(parts, attempt),
  };
}

export function paymentConfigOf(payments: PaymentsConfig, region: Region): PaymentConfig {
  const merchant = payments.merchants[region];
  return merchant === undefined
    ? { available: false, reason: 'This server has no PayPal credentials.' }
    : {
        available: true,
        environment: payments.environment,
        clientId: merchant.clientId,
        currency: REGION_PROFILES[region].currency,
        ...(payments.environment === 'sandbox' && payments.sandboxBuyer
          ? { sandboxBuyer: payments.sandboxBuyer }
          : {}),
      };
}

async function startOrder(
  parts: CheckoutParts,
  learnerId: string,
  { courseId, region, courseIds }: StartOrderRequest,
): Promise<StartedOrder> {
  const { orders, gatewayOf } = parts;
  if (courseIds !== undefined) {
    if (!courseIds.includes(courseId))
      throw new HttpProblem({
        status: 400,
        code: 'invalid_request',
        title: 'Invalid basket',
      });
    return openBasket(parts, learnerId, region, courseIds);
  }
  const course = findSellableCourse(courseId);
  if (course === undefined) {
    throw notFound('That course');
  }
  await assertCanBuy(parts, learnerId, courseId);
  const gateway = gatewayOf(region);
  const terms =
    parts.marketplace &&
    (await parts.marketplace.catalogue(region)).find((item) => item.courseId === courseId);
  if (terms && !terms.published) throw notFound('That course');
  const currency = REGION_PROFILES[region].currency;
  const listPrice = { currency, minorUnits: course.prices[currency] };
  const order = await orders.open({
    learnerId,
    courseId,
    region,
    method: 'paypal',
    amount: terms ? { ...listPrice, minorUnits: terms.priceMinor } : listPrice,
  });
  const amount = order.amount;
  const { paypalOrderId } = await withGateway(() =>
    gateway.openOrder({ orderId: order.id, description: orderDescription([course.title]), amount }),
  );
  await orders.attachPayPalOrder(order.id, paypalOrderId);
  return { orderId: order.id, paypalOrderId, amount };
}

/**
 * Captures an order once it holds its course. A course another order holds is refused before
 * PayPal is asked, so a second tab or an older order cannot charge for it again. An order that
 * is paid, failed or refunded is answered as it stands.
 */
async function captureOrder(
  parts: CheckoutParts,
  learnerId: string,
  orderId: string,
): Promise<CaptureResult> {
  const { orderOf, gatewayOf, settle, orders } = parts;
  const order = await orderOf(learnerId, orderId);
  if (order.status !== 'created' && order.status !== 'pending') {
    return resultOf(order);
  }
  if (order.paypalOrderId === undefined) {
    throw new HttpProblem({
      status: 409,
      code: 'order_not_opened',
      title: 'Order not opened at PayPal',
    });
  }
  const paypalOrderId = order.paypalOrderId;
  const gateway = gatewayOf(order.region);
  const holds = await claimBasket(parts, order);
  try {
    return await settle(order, await gateway.captureOrder(paypalOrderId, order.id), 'checkout');
  } catch (error) {
    if (error instanceof PaymentGatewayError && error.issue === 'ORDER_NOT_APPROVED') {
      // PayPal captured nothing, so the course is free again; any other failure keeps the hold
      // until PayPal says what happened.
      for (const hold of holds) await orders.releaseHold(hold);
      return { ...resultOf(order), issue: 'not-approved' };
    }
    if (error instanceof PaymentGatewayError && error.issue === 'INSTRUMENT_DECLINED') {
      return settle(order, { status: 'failed', reason: error.issue }, 'checkout');
    }
    throw asProblem(error);
  }
}

/**
 * Reads the order again at PayPal and records what it finds. A refund still pending is read
 * first, by its id: completed, it refunds the order; declined, the order is as before it was
 * asked, and may be refunded again.
 */
async function reconcile(
  parts: CheckoutParts,
  order: Order,
  source: SettlementSource,
): Promise<CaptureResult> {
  // A refund is final. A completed order is still read: it may have been refunded at PayPal.
  if (order.paypalOrderId === undefined || order.status === 'refunded') {
    return resultOf(order);
  }
  const paypalOrderId = order.paypalOrderId;
  const gateway = parts.gatewayOf(order.region);
  const current = await settleRefund(parts, order, source);
  if (current.status === 'refunded') {
    return resultOf(current);
  }
  return parts.settle(current, await withGateway(() => gateway.readOrder(paypalOrderId)), source);
}

async function settlePayPalAttempt(
  parts: CheckoutParts,
  { order, hold, stale }: HeldAttempt,
): Promise<void> {
  if (!stale) {
    return;
  }
  const settled = await reconcile(parts, order, 'reconciliation');
  if (settled.status === 'created') {
    await parts.orders.releaseHold(hold);
  }
}

async function listPayments(
  { orders, enrolments, clock }: CheckoutParts,
  learnerId: string,
): Promise<PaymentList> {
  const [learnerOrders, learnerEnrolments] = await Promise.all([
    orders.listByLearner(learnerId),
    enrolments.listByLearner(learnerId),
  ]);
  const enrolmentStatus = new Map(
    learnerEnrolments
      .toSorted((a, b) => Number(a.status === 'completed') - Number(b.status === 'completed'))
      .map((enrolment) => [enrolment.orderId, enrolment.status]),
  );
  const now = clock();
  return {
    refundWindowDays: REFUND_WINDOW_DAYS,
    payments: learnerOrders
      // An order opened and never approved moved no money: it is not a payment.
      .filter((order) => order.status !== 'created')
      .map((order) => paymentOf(order, isRefundable(order, enrolmentStatus.get(order.id), now))),
  };
}

function paymentOf(order: Order, refundable: boolean): Payment {
  return {
    orderId: order.id,
    courseId: order.courseId,
    courseTitle: (
      order.items?.map((item) => findSellableCourse(item.courseId)?.title ?? item.courseId) ?? [
        findSellableCourse(order.courseId)?.title ?? order.courseId,
      ]
    ).join(' + '),
    method: order.method,
    seller: DEMO_SELLER.name,
    amount: order.amount,
    status: order.status,
    createdAt: order.createdAt,
    paidAt: order.paidAt ?? null,
    refundedAt: order.refundedAt ?? null,
    paypalReference: order.paypalCaptureId ?? null,
    refundable,
    refund: refundStateOf(order),
  };
}

/** Whether a refund was asked of PayPal, and whether the money is back. */
function refundStateOf(order: Order): PaymentRefund {
  if (order.status === 'refunded') {
    return 'completed';
  }
  return order.refund?.status === 'pending' ? 'requested' : 'none';
}
