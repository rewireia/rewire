import type { Region } from '@rewire/contracts';

import { HttpProblem } from '../../http/problem.ts';
import type { Clock } from '../../platform/clock.ts';
import { PaymentGatewayError } from '../checkout/gateway.ts';
import { sameMoney } from '../checkout/money.ts';
import type { Order, SettlementSource } from '../checkout/order-store.ts';
import { isStale } from '../checkout/purchase-guards.ts';

import type { InvoiceRequest, InvoiceStanding, InvoicingGateway } from './invoicing.ts';
import type { SponsorshipStore, StoredSponsorship } from './sponsorship-store.ts';

/** What delivering and following an invoice needs. */
export interface DeliveryParts {
  readonly sponsorships: SponsorshipStore;
  readonly gatewayOf: (region: Region) => InvoicingGateway;
  readonly clock: Clock;
}

/**
 * What to do with a draft found while following up a request: send it as was asked, or, when the
 * learner withdraws the request, leave it unsent, which nobody can pay.
 */
export type DraftIntent = 'send' | 'withdraw';

/**
 * Creates the invoice of a request written as `sending`, keeps its id, then sends it. Each step is
 * recorded before the next, so an invoice that can be paid is always tied to its order.
 */
export async function deliver(
  parts: DeliveryParts,
  stored: StoredSponsorship,
  order: Order,
  request: InvoiceRequest,
): Promise<void> {
  const gateway = parts.gatewayOf(order.region);
  const invoiceId = await step(parts, stored, order, () => gateway.createDraft(request));
  await parts.sponsorships.recordDraft(stored, invoiceId);
  await sendDraft(parts, stored, order, invoiceId);
}

/** The requests whose invoice may still be paid: open ones, and those paid in part or by hand. */
const FOLLOWED = new Set<StoredSponsorship['status']>(['sending', 'sent', 'unconfirmed', 'review']);

/**
 * Asks PayPal how the invoice of an open request stands and records it. A request PayPal left
 * unanswered is found by its reference, our order id; one PayPal has no trace of is closed only
 * once any call it made has had time to end, so a late creation cannot be missed.
 */
export async function followUp(
  parts: DeliveryParts,
  stored: StoredSponsorship,
  order: Order,
  source: SettlementSource,
  intent: DraftIntent = 'send',
): Promise<void> {
  if (!FOLLOWED.has(stored.status)) {
    return;
  }
  const gateway = parts.gatewayOf(order.region);
  const { invoiceId } = stored;
  const standing = await withPayPal(() =>
    invoiceId === undefined ? gateway.findByReference(order.id) : gateway.readInvoice(invoiceId),
  );
  if (standing === undefined) {
    if (isStale(stored.requestedAt, parts.clock())) {
      await parts.sponsorships.recordRefused(stored, order, 'INVOICE_NOT_FOUND');
    }
    return;
  }
  await parts.sponsorships.recordDraft(stored, standing.invoiceId);
  await record(parts, stored, order, standing, { source, intent });
}

async function record(
  parts: DeliveryParts,
  stored: StoredSponsorship,
  order: Order,
  standing: InvoiceStanding,
  { source, intent }: { source: SettlementSource; intent: DraftIntent },
): Promise<void> {
  const { sponsorships } = parts;
  switch (standing.state) {
    case 'draft':
      if (intent === 'withdraw') {
        await sponsorships.recordCancelled(stored, order, standing.invoiceId);
      } else {
        await sendDraft(parts, stored, order, standing.invoiceId);
      }
      return;
    case 'sent':
      await sponsorships.recordSent(stored, order, standing);
      return;
    case 'paid':
    case 'review':
      await sponsorships.recordSent(stored, order, standing);
      await recordPayment(parts, stored, order, standing, source);
      return;
    case 'cancelled':
      await sponsorships.recordCancelled(stored, order, standing.invoiceId);
  }
}

/**
 * The policy for an invoice PayPal reports paid. Only a payment in full, observed at PayPal, of
 * the invoice Rewire sent for this very order, in its currency and for its amount, opens the
 * course, and the ledger records what PayPal reports paid. Anything else (paid in part, another
 * amount or currency, another invoice or reference, marked as paid by hand) is kept on the order
 * as received and the request waits in review, holding the course and opening nothing.
 */
async function recordPayment(
  { sponsorships }: DeliveryParts,
  stored: StoredSponsorship,
  order: Order,
  standing: InvoiceStanding,
  source: SettlementSource,
): Promise<void> {
  const reason = reviewReasonOf(stored, order, standing);
  const { invoiceId: reference, paid } = standing;
  if (reason === undefined && paid !== undefined) {
    await sponsorships.recordPaid(stored, order, { reference, amount: paid, refunds: [] }, source);
    return;
  }
  const review = { reference, reason: reason ?? 'UNREADABLE_PAYMENT', observed: standing.observed };
  await sponsorships.recordReview(stored, order, review, source);
}

/** Why a payment PayPal reports cannot open the course, or `undefined` when it can. */
function reviewReasonOf(
  stored: StoredSponsorship,
  order: Order,
  { state, invoiceId, reference, paid, observed }: InvoiceStanding,
): string | undefined {
  if (state !== 'paid') {
    return `INVOICE_${observed.status ?? 'UNKNOWN'}`;
  }
  if (stored.invoiceId !== undefined && stored.invoiceId !== invoiceId) {
    return 'INVOICE_MISMATCH';
  }
  if (reference !== order.id) {
    return 'REFERENCE_MISMATCH';
  }
  if (paid === undefined) {
    return 'UNREADABLE_PAYMENT';
  }
  return sameMoney(paid, order.amount) ? undefined : 'AMOUNT_MISMATCH';
}

/** Sends a draft, then records it as sent with the page to pay on, if PayPal shows it yet. */
async function sendDraft(
  parts: DeliveryParts,
  stored: StoredSponsorship,
  order: Order,
  invoiceId: string,
): Promise<void> {
  const gateway = parts.gatewayOf(order.region);
  await step(parts, stored, order, () => gateway.sendDraft(invoiceId, order.id));
  // The invoice is out whether or not it can be read now: a refresh learns the page later.
  const payUrl = await gateway.readInvoice(invoiceId).then(
    (standing) => standing.payUrl,
    (error: unknown) => {
      if (error instanceof PaymentGatewayError) {
        return undefined;
      }
      throw error;
    },
  );
  await parts.sponsorships.recordSent(stored, order, { invoiceId, payUrl });
}

/**
 * Runs a write at PayPal. When it fails, the request is recorded as refused if PayPal said no,
 * and as unconfirmed if PayPal may have done it; the answer is the 502 either way.
 */
async function step<Result>(
  { sponsorships }: DeliveryParts,
  stored: StoredSponsorship,
  order: Order,
  call: () => Promise<Result>,
): Promise<Result> {
  try {
    return await call();
  } catch (error) {
    if (error instanceof PaymentGatewayError) {
      await (error.outcome === 'refused'
        ? sponsorships.recordRefused(stored, order, error.issue)
        : sponsorships.recordUnconfirmed(stored));
    }
    throw asProblem(error);
  }
}

/** Runs a call to PayPal, turning its failures into problem answers. */
export async function withPayPal<Result>(call: () => Promise<Result>): Promise<Result> {
  try {
    return await call();
  } catch (error) {
    throw asProblem(error);
  }
}

/**
 * A failure of PayPal becomes a 502 that names PayPal's own code, to look it up. When PayPal did
 * not say what it did, the answer says that Rewire will ask again.
 */
function asProblem(error: unknown): unknown {
  if (!(error instanceof PaymentGatewayError)) {
    return error;
  }
  const debugId = error.debugId === undefined ? '' : ` (debug id ${error.debugId})`;
  const unknown =
    error.outcome === 'unknown' ? ' Rewire asks PayPal again before anything else is sent.' : '';
  return new HttpProblem({
    status: 502,
    code: 'payment_provider_error',
    title: 'PayPal could not complete the request',
    detail: `PayPal answered ${error.issue}${debugId}.${unknown}`,
  });
}
