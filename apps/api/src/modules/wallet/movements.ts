import { findSellableCourse } from '@rewire/content';
import type { Region, WalletMovement, WalletMovements } from '@rewire/contracts';

import type { Order, OrderStore } from '../checkout/order-store.ts';

import type { TopUp, TopUpStore } from './top-up-store.ts';

/**
 * Everything that moved money in or out of the wallet, newest first: each top-up PayPal answered,
 * each payment from the wallet, and each refund of one back to it. An attempt PayPal never
 * answered moved nothing, and is left out.
 */
export async function walletMovements(
  { topUps, orders }: { readonly topUps: TopUpStore; readonly orders: OrderStore },
  learnerId: string,
  region: Region,
): Promise<WalletMovements> {
  const [moved, learnerOrders] = await Promise.all([
    topUps.listMoved(learnerId, region),
    orders.listByLearner(learnerId),
  ]);
  const payments = learnerOrders.filter(
    (order) =>
      order.method === 'wallet' &&
      order.region === region &&
      (order.status === 'completed' || order.status === 'refunded'),
  );
  return {
    movements: [...moved.flatMap(topUpMovementOf), ...payments.flatMap(paymentMovementsOf)].sort(
      (a, b) => b.occurredAt.localeCompare(a.occurredAt),
    ),
  };
}

function topUpMovementOf(topUp: TopUp): WalletMovement[] {
  if (topUp.status === 'created') return [];
  return [
    {
      id: topUp.id,
      kind: 'top-up',
      currency: topUp.amount.currency,
      amountMinor: topUp.amount.minorUnits,
      status: topUp.status,
      occurredAt: topUp.completedAt ?? topUp.createdAt,
      paypalReference: topUp.paypalCaptureId ?? null,
      title: null,
    },
  ];
}

function paymentMovementsOf(order: Order): WalletMovement[] {
  const title = (order.items?.map((item) => item.courseId) ?? [order.courseId])
    .map((id) => findSellableCourse(id)?.title ?? id)
    .join(' + ');
  const line = {
    currency: order.amount.currency,
    paypalReference: null,
    title,
    status: 'completed',
  } as const;
  const paid: WalletMovement = {
    ...line,
    id: order.id,
    kind: 'course-payment',
    amountMinor: -order.amount.minorUnits,
    occurredAt: order.paidAt ?? order.createdAt,
  };
  return order.refundedAt === undefined
    ? [paid]
    : [
        paid,
        {
          ...line,
          id: `${order.id}-refund`,
          kind: 'refund',
          amountMinor: order.amount.minorUnits,
          occurredAt: order.refundedAt,
        },
      ];
}
