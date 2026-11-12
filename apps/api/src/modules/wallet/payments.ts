import { findSellableCourse, REGION_PROFILES } from '@rewire/content';
import type { CaptureResult, Region, WalletPaymentRequest } from '@rewire/contracts';

import { HttpProblem, notFound } from '../../http/problem.ts';
import type { Clock } from '../../platform/clock.ts';
import type { Database } from '../../platform/database.ts';
import { paidStatements } from '../checkout/order-ledger.ts';
import { openingStatements, type NewOrder, type Order } from '../checkout/order-store.ts';
import {
  assertCanBuy,
  refusalFor,
  type PurchaseGuardDependencies,
} from '../checkout/purchase-guards.ts';
import { isHeldElsewhere } from '../checkout/purchase-holds.ts';
import { walletReferenceOf } from '../checkout/refund-ledger.ts';
import { resultOf } from '../checkout/settlement.ts';
import type { Marketplace } from '../marketplace/service.ts';

import { walletBalance } from './balance.ts';

/** What paying from the wallet needs. */
interface WalletPaymentParts extends PurchaseGuardDependencies {
  readonly database: Database;
  readonly marketplace: Marketplace;
  readonly clock: Clock;
  readonly assertSandbox: () => void;
}

/** A course to pay for, and the price the server set for it. */
interface Line {
  readonly courseId: string;
  readonly amountMinor: number;
}

/**
 * Pays for courses from the wallet balance. The server prices them (the published terms, or the
 * price agreed in an offer), refuses what the purchase guards refuse, and in one transaction
 * checks the balance, stores the order with its lines, holds every course, records the payment
 * in the ledger and enrols the learner. Sent twice, the second finds the courses held and is
 * refused: nothing is charged twice.
 */
export async function payFromWallet(
  parts: WalletPaymentParts,
  learnerId: string,
  request: WalletPaymentRequest,
): Promise<CaptureResult> {
  parts.assertSandbox();
  const { region, courseIds } = request;
  if (new Set(courseIds).size !== courseIds.length) {
    throw new HttpProblem({ status: 400, code: 'invalid_request', title: 'Invalid basket' });
  }
  const lines = await linesOf(parts.marketplace, region, courseIds);
  for (const { courseId } of lines) await assertCanBuy(parts, learnerId, courseId);
  try {
    return resultOf(await settleInOneTransaction(parts, learnerId, region, lines));
  } catch (error) {
    if (!isHeldElsewhere(error)) throw error;
    throw await refusalOfHeld(parts, learnerId, lines);
  }
}

/** Every course must be on sale in the region, at the fixed price the seller published. */
async function linesOf(
  marketplace: Marketplace,
  region: Region,
  courseIds: readonly string[],
): Promise<Line[]> {
  const terms = await marketplace.catalogue(region);
  return courseIds.map((courseId) => {
    const course = terms.find((item) => item.courseId === courseId);
    if (!course?.published || !findSellableCourse(courseId)) {
      throw notFound('That course');
    }
    return { courseId, amountMinor: course.priceMinor };
  });
}

async function settleInOneTransaction(
  parts: WalletPaymentParts,
  learnerId: string,
  region: Region,
  lines: readonly Line[],
): Promise<Order> {
  const at = parts.clock().toISOString();
  const tx = await parts.database.transaction('write');
  try {
    const total = lines.reduce((sum, line) => sum + line.amountMinor, 0);
    const balance = await walletBalance(tx, learnerId, region);
    if (balance.availableMinor < total) throw insufficientBalance();
    const [order, opening] = openingStatements(newOrderOf(learnerId, region, lines, total), at);
    const paid = { reference: walletReferenceOf(order.id), amount: order.amount, refunds: [] };
    for (const statement of [...opening, ...paidStatements(order, paid, 'checkout', at)]) {
      await tx.execute(statement);
    }
    await tx.commit();
    return { ...order, status: 'completed', paidAt: at };
  } catch (error) {
    await tx.rollback();
    throw error;
  }
}

function newOrderOf(
  learnerId: string,
  region: Region,
  lines: readonly Line[],
  total: number,
): NewOrder {
  const [first] = lines;
  if (first === undefined) throw notFound('That course');
  return {
    learnerId,
    courseId: first.courseId,
    region,
    method: 'wallet',
    amount: { currency: REGION_PROFILES[region].currency, minorUnits: total },
    ...(lines.length > 1 ? { items: lines } : {}),
  };
}

/** The answer of the order that holds the first course another order took meanwhile. */
async function refusalOfHeld(
  parts: WalletPaymentParts,
  learnerId: string,
  lines: readonly Line[],
): Promise<HttpProblem> {
  for (const { courseId } of lines) {
    if ((await parts.orders.holderOf(learnerId, courseId)) !== undefined) {
      return refusalFor(parts, learnerId, courseId);
    }
  }
  return refusalFor(parts, learnerId, lines[0]?.courseId ?? '');
}

function insufficientBalance(): HttpProblem {
  return new HttpProblem({
    status: 409,
    code: 'insufficient_balance',
    title: 'Not enough money in the wallet',
    detail: 'Add funds with PayPal, then pay again.',
  });
}
