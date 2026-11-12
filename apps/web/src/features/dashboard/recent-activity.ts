import type { Currency, Payment, Wallet, WalletMovement } from '@rewire/contracts';

/** How an entry of the activity ended: money moved, still waiting, or it did not go through. */
type ActivityOutcome = 'done' | 'waiting' | 'failed';

/** One line of the recent activity: a course paid, its refund, or money added to the wallet. */
export interface ActivityEntry {
  readonly id: string;
  readonly kind: 'payment' | 'refund' | 'top-up';
  /** The course, or `null` for a top-up. */
  readonly title: string | null;
  readonly currency: Currency;
  /** Signed, in minor units: positive when money comes in, negative when it goes out. */
  readonly amountMinor: number;
  readonly outcome: ActivityOutcome;
  readonly at: string;
}

const PAYMENT_OUTCOME: Record<Payment['status'], ActivityOutcome> = {
  completed: 'done',
  refunded: 'done',
  pending: 'waiting',
  created: 'waiting',
  failed: 'failed',
};

const MOVEMENT_OUTCOME: Record<WalletMovement['status'], ActivityOutcome> = {
  completed: 'done',
  refunded: 'done',
  pending: 'waiting',
  failed: 'failed',
  mismatched: 'failed',
};

/**
 * The latest entries, newest first. A course paid from the wallet is already one of the
 * payments, so only the top-ups are taken from the wallet's movements: nothing is counted twice.
 */
export function recentActivity(
  payments: readonly Payment[],
  movements: readonly WalletMovement[],
  limit: number,
): readonly ActivityEntry[] {
  const entries = [
    ...payments.flatMap(paymentEntries),
    ...movements.filter((movement) => movement.kind === 'top-up').map(topUpEntry),
  ];
  return entries.sort((left, right) => right.at.localeCompare(left.at)).slice(0, limit);
}

function paymentEntries(payment: Payment): readonly ActivityEntry[] {
  const paid: ActivityEntry = {
    id: `payment-${payment.orderId}`,
    kind: 'payment',
    title: payment.courseTitle,
    currency: payment.amount.currency,
    amountMinor: -payment.amount.minorUnits,
    outcome: PAYMENT_OUTCOME[payment.status],
    at: payment.paidAt ?? payment.createdAt,
  };
  if (payment.status !== 'refunded' || payment.refundedAt === null) {
    return [paid];
  }
  return [
    paid,
    {
      ...paid,
      id: `refund-${payment.orderId}`,
      kind: 'refund',
      amountMinor: payment.amount.minorUnits,
      at: payment.refundedAt,
    },
  ];
}

function topUpEntry(movement: WalletMovement): ActivityEntry {
  return {
    id: `top-up-${movement.id}`,
    kind: 'top-up',
    title: null,
    currency: movement.currency,
    amountMinor: movement.amountMinor,
    outcome: MOVEMENT_OUTCOME[movement.status],
    at: movement.occurredAt,
  };
}

/** The money added split in what was spent and what is left, in percent. */
export function walletSplit(
  wallet: Wallet,
): { readonly spent: number; readonly available: number } | null {
  const total = wallet.spentMinor + wallet.availableMinor;
  if (total <= 0) {
    return null;
  }
  const share = (minor: number) => Math.round((minor / total) * 1000) / 10;
  return { spent: share(wallet.spentMinor), available: share(wallet.availableMinor) };
}
