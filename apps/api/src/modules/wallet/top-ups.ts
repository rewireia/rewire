import { REGION_PROFILES } from '@rewire/content';
import type {
  PaymentIssue,
  Region,
  StartedTopUp,
  TopUpRequest,
  TopUpResult,
} from '@rewire/contracts';

import { HttpProblem, notFound } from '../../http/problem.ts';
import type { Logger } from '../../logger.ts';
import {
  PaymentGatewayError,
  type CaptureOutcome,
  type PaymentGateway,
} from '../checkout/gateway.ts';
import { asProblem, withGateway } from '../checkout/gateway-problems.ts';
import { sameMoney } from '../checkout/money.ts';
import type { PaymentReference } from '../checkout/webhook-routes.ts';

import type { TopUp, TopUpStore } from './top-up-store.ts';

/** What adding money with PayPal needs. */
interface TopUpParts {
  readonly topUps: TopUpStore;
  readonly gatewayOf: (region: Region) => PaymentGateway;
  /** Refuses with a 409 when PayPal is not in sandbox: the wallet never holds real money. */
  readonly assertSandbox: () => void;
  readonly logger: Logger;
}

/**
 * Opens a top-up: the server stores it with the amount asked, in the region's currency, then
 * opens the order at PayPal under the top-up's id. It adds nothing until it is captured.
 */
export async function openTopUp(
  parts: TopUpParts,
  learnerId: string,
  { region, amountMinor }: TopUpRequest,
): Promise<StartedTopUp> {
  parts.assertSandbox();
  const gateway = parts.gatewayOf(region);
  const amount = { currency: REGION_PROFILES[region].currency, minorUnits: amountMinor };
  const topUp = await parts.topUps.open(learnerId, region, amount);
  const { paypalOrderId } = await withGateway(() =>
    gateway.openOrder({
      orderId: topUp.id,
      amount,
      description: 'Rewire wallet top-up',
    }),
  );
  await parts.topUps.attachPayPalOrder(topUp.id, paypalOrderId);
  return { topUpId: topUp.id, paypalOrderId, amount };
}

/**
 * Captures a top-up the buyer approved. A top-up already settled is answered as it stands, and
 * one PayPal holds, or that did not match, is read again instead: capturing is safe to repeat.
 */
export async function captureTopUp(
  parts: TopUpParts,
  learnerId: string,
  id: string,
): Promise<TopUpResult> {
  const topUp = await ownTopUp(parts.topUps, learnerId, id);
  if (topUp.status !== 'created') {
    return refreshTopUp(parts, learnerId, id);
  }
  if (topUp.paypalOrderId === undefined) {
    throw new HttpProblem({
      status: 409,
      code: 'order_not_opened',
      title: 'Top-up not opened at PayPal',
    });
  }
  const paypalOrderId = topUp.paypalOrderId;
  try {
    const outcome = await parts.gatewayOf(topUp.region).captureOrder(paypalOrderId, topUp.id);
    return await settleTopUp(parts, topUp, outcome);
  } catch (error) {
    if (error instanceof PaymentGatewayError && error.issue === 'ORDER_NOT_APPROVED') {
      return resultOf(topUp, 'not-approved');
    }
    if (error instanceof PaymentGatewayError && error.issue === 'INSTRUMENT_DECLINED') {
      return settleTopUp(parts, topUp, { status: 'failed', reason: error.issue });
    }
    throw asProblem(error);
  }
}

/** Reads a top-up again at PayPal and records what it finds. A settled one is left as it is. */
export async function refreshTopUp(
  parts: TopUpParts,
  learnerId: string,
  id: string,
): Promise<TopUpResult> {
  const topUp = await ownTopUp(parts.topUps, learnerId, id);
  if (!isUnsettled(topUp) || topUp.paypalOrderId === undefined) {
    return resultOf(topUp);
  }
  const paypalOrderId = topUp.paypalOrderId;
  const outcome = await withGateway(() => parts.gatewayOf(topUp.region).readOrder(paypalOrderId));
  return settleTopUp(parts, topUp, outcome);
}

/**
 * Reads at PayPal every top-up of the learner still waiting on it, so the balance shown counts a
 * capture PayPal has released since. PayPal out of reach leaves them as they are.
 */
export async function refreshUnsettled(
  parts: TopUpParts,
  learnerId: string,
  region: Region,
): Promise<void> {
  for (const topUp of await parts.topUps.listUnsettled(learnerId, region)) {
    try {
      await refreshTopUp(parts, learnerId, topUp.id);
    } catch (error) {
      parts.logger.warn('top-up could not be read at PayPal', {
        topUpId: topUp.id,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}

/**
 * Settles the top-up a PayPal webhook is about, found by our id or by PayPal's order id, with the
 * same reading as a refresh: the event is only a hint. Returns whether it was a top-up.
 */
export async function settleTopUpEvent(
  parts: TopUpParts,
  { id, paypalOrderId }: PaymentReference,
): Promise<boolean> {
  const topUp =
    (id === undefined ? undefined : await parts.topUps.find(id)) ??
    (paypalOrderId === undefined ? undefined : await parts.topUps.findByPayPalOrder(paypalOrderId));
  if (topUp === undefined) return false;
  await refreshTopUp(parts, topUp.learnerId, topUp.id);
  return true;
}

function isUnsettled(topUp: TopUp): boolean {
  return topUp.status === 'created' || topUp.status === 'pending' || topUp.status === 'mismatched';
}

/** A top-up of the learner, or a 404: other learners' top-ups do not exist for them. */
async function ownTopUp(topUps: TopUpStore, learnerId: string, id: string): Promise<TopUp> {
  const topUp = await topUps.find(id);
  if (topUp?.learnerId !== learnerId) {
    throw notFound('That top-up');
  }
  return topUp;
}

/**
 * The one place where what PayPal reports becomes a change of a top-up, with the guarantees of the
 * checkout: only a capture of exactly the amount asked, for this very top-up, adds to the balance;
 * a held one waits; a refused one adds nothing; and one that does not match adds nothing and is
 * given back.
 */
async function settleTopUp(
  parts: TopUpParts,
  topUp: TopUp,
  outcome: CaptureOutcome,
): Promise<TopUpResult> {
  const issue = await record(parts, topUp, outcome);
  return resultOf((await parts.topUps.find(topUp.id)) ?? topUp, issue);
}

async function record(
  parts: TopUpParts,
  topUp: TopUp,
  outcome: CaptureOutcome,
): Promise<PaymentIssue | null> {
  const { topUps } = parts;
  switch (outcome.status) {
    case 'completed': {
      const sameTopUp = outcome.orderId === undefined || outcome.orderId === topUp.id;
      if (sameTopUp && sameMoney(outcome.amount, topUp.amount) && topUp.status !== 'mismatched') {
        await topUps.recordCompleted(topUp, outcome);
        return null;
      }
      parts.logger.error('top-up capture does not match', {
        topUpId: topUp.id,
        captureId: outcome.captureId,
      });
      await topUps.recordMismatched(topUp, outcome);
      await giveBack(parts, topUp, outcome.captureId);
      return 'mismatch';
    }
    case 'pending':
      await topUps.recordPending(topUp, outcome.captureId);
      return 'held-by-paypal';
    case 'review':
      await topUps.recordPending(topUp, outcome.captureId);
      return 'needs-review';
    case 'failed':
      await topUps.recordFailed(topUp);
      return 'declined';
    case 'refunded':
      await topUps.recordRefunded(topUp);
      return null;
    case 'not-captured':
      return 'not-approved';
  }
}

/**
 * Gives back a capture that does not match its top-up, once: the refund is asked under the
 * top-up's own key, and recorded as PayPal answers it.
 */
async function giveBack(parts: TopUpParts, topUp: TopUp, captureId: string): Promise<void> {
  const current = await parts.topUps.find(topUp.id);
  if (current?.status !== 'mismatched' || current.refundId !== undefined) {
    return;
  }
  try {
    const refund = await parts
      .gatewayOf(topUp.region)
      .refundCapture(captureId, `refund-top-up-${topUp.id}`);
    if (refund.status === 'completed') {
      await parts.topUps.recordRefunded(current);
    } else if (refund.status === 'pending') {
      await parts.topUps.recordRefundAsked(current, refund.refundId);
    }
  } catch (error) {
    parts.logger.error('refund of a top-up that does not match could not be asked', {
      topUpId: topUp.id,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

function resultOf(topUp: TopUp, issue: PaymentIssue | null = null): TopUpResult {
  return { topUpId: topUp.id, status: topUp.status, amount: topUp.amount, issue };
}
