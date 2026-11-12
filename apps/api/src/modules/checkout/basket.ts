import { findSellableCourse, REGION_PROFILES } from '@rewire/content';
import type { Region, StartedOrder } from '@rewire/contracts';
import { HttpProblem, notFound } from '../../http/problem.ts';
import type { CheckoutDependencies } from './checkout-service.ts';
import { withGateway } from './gateway-problems.ts';
import { orderDescription } from './order-description.ts';
import type { PaymentGateway } from './gateway.ts';
import type { Order } from './order-store.ts';
import { assertCanBuy, claimCourse, type PurchaseGuardDependencies } from './purchase-guards.ts';
import type { Hold } from './purchase-holds.ts';

/** The most courses one payment may hold. */
const MAXIMUM_BASKET = 10;

/**
 * A basket is priced from published provider terms, never from browser amounts. Paid with PayPal,
 * it neither needs nor touches the wallet balance.
 */
export async function openBasket(
  parts: CheckoutDependencies &
    PurchaseGuardDependencies & { gatewayOf(region: Region): PaymentGateway },
  learnerId: string,
  region: Region,
  ids: readonly string[],
): Promise<StartedOrder> {
  if (
    !parts.marketplace ||
    ids.length < 1 ||
    ids.length > MAXIMUM_BASKET ||
    new Set(ids).size !== ids.length
  ) {
    throw new HttpProblem({ status: 400, code: 'invalid_request', title: 'Invalid basket' });
  }
  const terms = await parts.marketplace.catalogue(region);
  const items = ids.map((courseId) => {
    const course = terms.find((item) => item.courseId === courseId && item.published);
    if (!course || !findSellableCourse(courseId)) throw notFound('That course');
    return { courseId, amountMinor: course.priceMinor };
  });
  for (const item of items) await assertCanBuy(parts, learnerId, item.courseId);
  const amount = {
    currency: REGION_PROFILES[region].currency,
    minorUnits: items.reduce((sum, item) => sum + item.amountMinor, 0),
  };
  const courseId = ids[0];
  if (!courseId) throw notFound('That course');
  const order = await parts.orders.open({
    learnerId,
    courseId,
    region,
    method: 'paypal',
    amount,
    items,
  });
  const { paypalOrderId } = await withGateway(() =>
    parts.gatewayOf(region).openOrder({
      orderId: order.id,
      amount,
      description: orderDescription(
        items.map(({ courseId }) => findSellableCourse(courseId)?.title ?? courseId),
      ),
    }),
  );
  await parts.orders.attachPayPalOrder(order.id, paypalOrderId);
  return { orderId: order.id, paypalOrderId, amount };
}

/** Claim every selected course before capturing one payment. Roll back incomplete claims. */
export async function claimBasket(
  parts: CheckoutDependencies & PurchaseGuardDependencies,
  order: Order,
): Promise<Hold[]> {
  const holds: Hold[] = [];
  try {
    const ids = (order.items?.map((item) => item.courseId) ?? [order.courseId]).toSorted();
    for (const courseId of ids) holds.push(await claimCourse(parts, { ...order, courseId }));
    return holds;
  } catch (error) {
    for (const hold of holds) await parts.orders.releaseHold(hold);
    throw error;
  }
}
