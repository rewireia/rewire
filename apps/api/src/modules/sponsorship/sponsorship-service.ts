import { findDemoCourse, priceOf, REGION_PROFILES, type RegionProfile } from '@rewire/content';
import type { Region, Sponsorship, SponsorshipRequest } from '@rewire/contracts';

import { HttpProblem, notFound } from '../../http/problem.ts';
import type { Marketplace } from '../marketplace/service.ts';
import type { Clock } from '../../platform/clock.ts';
import type { Order, OrderStore } from '../checkout/order-store.ts';
import {
  assertCanBuy,
  refusalFor,
  type HeldAttempt,
  type SettleAttempt,
} from '../checkout/purchase-guards.ts';

import { deliver, followUp, withPayPal, type DeliveryParts } from './invoice-delivery.ts';
import type { InvoicingGateway } from './invoicing.ts';
import type { SponsorshipStore, StoredSponsorship } from './sponsorship-store.ts';

export interface SponsorshipDependencies {
  /** The invoicing of the merchant of each region; none where PayPal is not set up. */
  readonly marketplace?: Marketplace;
  readonly invoicing: Readonly<Partial<Record<Region, InvoicingGateway>>>;
  readonly orders: OrderStore;
  readonly sponsorships: SponsorshipStore;
  /** Settles a PayPal order that holds a course and may have been left unanswered. */
  readonly settlePaymentAttempt: SettleAttempt;
  readonly clock: Clock;
}

/**
 * "Ask my employer to pay": the learner names their employer, Rewire sends a PayPal
 * invoice that quotes the rule of their region, and the course opens when PayPal says the
 * invoice is paid.
 */
export interface SponsorshipService {
  request(learnerId: string, request: SponsorshipRequest): Promise<Sponsorship>;
  /** Asks PayPal how the invoice stands and records what changed. */
  refresh(learnerId: string, sponsorshipId: string): Promise<Sponsorship>;
  /**
   * Withdraws a request whose invoice is still out, so the learner may pay for the course
   * themselves. An invoice found paid is recorded as paid instead, and the answer is a 409.
   */
  cancel(learnerId: string, sponsorshipId: string): Promise<Sponsorship>;
  /**
   * The same, for an invoice PayPal notified us about, found by its id or by its reference, our
   * order id. Unknown invoices are ignored.
   */
  reconcileInvoice(invoiceId: string, reference: string | undefined): Promise<void>;
  list(learnerId: string): Promise<Sponsorship[]>;
  /** Follows up at PayPal an invoice request that holds a course and was left unanswered. */
  settleAttempt: SettleAttempt;
}

/** What every step of a sponsorship shares. */
interface SponsorshipParts extends SponsorshipDependencies, DeliveryParts {
  readonly settleAttempt: SettleAttempt;
  /** A request of the learner with its order, or a 404: other learners' do not exist for them. */
  readonly ownedBy: (
    learnerId: string,
    sponsorshipId: string,
  ) => Promise<[StoredSponsorship, Order]>;
}

export function createSponsorshipService(
  dependencies: SponsorshipDependencies,
): SponsorshipService {
  const { orders, sponsorships } = dependencies;
  const parts: SponsorshipParts = {
    ...dependencies,
    gatewayOf: invoicingFinder(dependencies),
    settleAttempt: (attempt) =>
      attempt.order.method === 'employer-invoice'
        ? settleInvoiceAttempt(parts, attempt)
        : dependencies.settlePaymentAttempt(attempt),
    async ownedBy(learnerId, sponsorshipId) {
      const stored = await sponsorships.find(sponsorshipId);
      const order = stored === undefined ? undefined : await orders.find(stored.orderId);
      if (stored === undefined || order?.learnerId !== learnerId) {
        throw notFound('That request');
      }
      return [stored, order];
    },
  };

  return {
    request: (learnerId, request) => requestSponsorship(parts, learnerId, request),
    async refresh(learnerId, sponsorshipId) {
      const [stored, order] = await parts.ownedBy(learnerId, sponsorshipId);
      await followUp(parts, stored, order, 'reconciliation');
      return present(orders, (await sponsorships.find(sponsorshipId)) ?? stored);
    },
    cancel: (learnerId, sponsorshipId) => cancelSponsorship(parts, learnerId, sponsorshipId),
    async reconcileInvoice(invoiceId, reference) {
      const stored =
        (await sponsorships.findByInvoice(invoiceId)) ??
        (reference === undefined ? undefined : await sponsorships.findByOrder(reference));
      const order = stored === undefined ? undefined : await orders.find(stored.orderId);
      if (stored !== undefined && order !== undefined) {
        await followUp(parts, stored, order, 'webhook');
      }
    },
    async list(learnerId) {
      const stored = await sponsorships.listByLearner(learnerId);
      return Promise.all(stored.map((sponsorship) => present(orders, sponsorship)));
    },
    settleAttempt: (attempt) => settleInvoiceAttempt(parts, attempt),
  };
}

/**
 * A request that holds its course while PayPal has not confirmed it is followed up first; one
 * sent holds it until it is paid or cancelled.
 */
async function settleInvoiceAttempt(parts: SponsorshipParts, { order }: HeldAttempt) {
  const stored = await parts.sponsorships.findByOrder(order.id);
  if (stored !== undefined && stored.status !== 'sent') {
    await followUp(parts, stored, order, 'reconciliation');
  }
}

/** The invoicing of a region, or a 503 that says plainly no invoice can be sent there. */
function invoicingFinder({ invoicing }: SponsorshipDependencies) {
  return (region: Region): InvoicingGateway => {
    const gateway = invoicing[region];
    if (gateway === undefined) {
      throw new HttpProblem({
        status: 503,
        code: 'payments_unavailable',
        title: 'Payments are not set up',
        detail: 'This server has no PayPal credentials for the region, so no invoice can be sent.',
      });
    }
    return gateway;
  };
}

/**
 * Opens an order priced by the catalogue, takes its course and writes the request, all before
 * PayPal is called; then creates and sends the invoice to the employer.
 */
async function requestSponsorship(
  parts: SponsorshipParts,
  learnerId: string,
  { courseId, region, employerEmail, employerName }: SponsorshipRequest,
): Promise<Sponsorship> {
  const { orders, sponsorships, gatewayOf } = parts;
  const course = findDemoCourse(courseId);
  if (course === undefined) {
    throw notFound('That course');
  }
  const gateway = gatewayOf(region);
  await assertCanBuy(parts, learnerId, courseId);
  const profile = REGION_PROFILES[region];
  const terms =
    parts.marketplace &&
    (await parts.marketplace.catalogue(region)).find((item) => item.courseId === courseId);
  if (terms && !terms.published) throw notFound('That course');
  const original = priceOf(course, profile.currency);
  const amount = terms ? { ...original, minorUnits: terms.priceMinor } : original;
  const invoiceNumber = await withPayPal(() => gateway.nextNumber());
  const method = 'employer-invoice';
  const opened = await sponsorships.open(
    { learnerId, courseId, region, method, amount },
    invoiceNumber,
  );
  if (opened === undefined) {
    throw await refusalFor(parts, learnerId, courseId);
  }
  const [stored, order] = opened;
  await deliver(parts, stored, order, {
    orderId: order.id,
    invoiceNumber,
    // Handed to PayPal and never stored: the employer is not a user of Rewire.
    recipientEmail: employerEmail,
    recipientName: employerName,
    itemName: `${course.title} (demo course)`,
    itemDescription: course.summary,
    amount,
    note: noteFor(profile),
  });
  return present(orders, (await sponsorships.find(stored.id)) ?? stored);
}

/**
 * Cancels the invoice of a request still out. PayPal is read first: cancelling an invoice the
 * employer has just paid would leave them without what they paid for, so a paid one is recorded,
 * course included, and the request is refused as no longer open. A draft never sent is left
 * unsent, and the request withdrawn.
 */
async function cancelSponsorship(
  parts: SponsorshipParts,
  learnerId: string,
  sponsorshipId: string,
): Promise<Sponsorship> {
  const { orders, sponsorships, gatewayOf, ownedBy } = parts;
  const [stored, order] = await ownedBy(learnerId, sponsorshipId);
  if (!isOpen(stored)) {
    throw invoiceNotOpen();
  }
  await followUp(parts, stored, order, 'reconciliation', 'withdraw');
  const current = (await sponsorships.find(sponsorshipId)) ?? stored;
  const { invoiceId } = current;
  if (current.status === 'sent' && invoiceId !== undefined) {
    await withPayPal(() => gatewayOf(order.region).cancelInvoice(invoiceId));
    await sponsorships.recordCancelled(current, order, invoiceId);
  } else if (current.status !== 'cancelled') {
    throw isOpen(current) ? invoiceUnconfirmed() : invoiceNotOpen();
  }
  return present(orders, (await sponsorships.find(sponsorshipId)) ?? current);
}

const isOpen = ({ status }: StoredSponsorship) =>
  status === 'sending' || status === 'sent' || status === 'unconfirmed';

function invoiceUnconfirmed(): HttpProblem {
  return new HttpProblem({
    status: 409,
    code: 'invoice_unconfirmed',
    title: 'Invoice not confirmed yet',
    detail: 'PayPal has not yet confirmed this invoice. Try again in a few minutes.',
  });
}

function invoiceNotOpen(): HttpProblem {
  return new HttpProblem({
    status: 409,
    code: 'invoice_not_open',
    title: 'Invoice no longer open',
    detail: 'This invoice has already been paid or cancelled, so it cannot be cancelled.',
  });
}

/** The note on the invoice: why the training is asked for, in the words of the region's rule. */
function noteFor({ employerCase }: RegionProfile): string {
  return (
    `A member of your staff asks you to pay for this training. ${employerCase.headline}: ` +
    `"${employerCase.quote}" (${employerCase.source.title}, ${employerCase.source.url})`
  );
}

async function present(orders: OrderStore, stored: StoredSponsorship): Promise<Sponsorship> {
  const order = await orders.find(stored.orderId);
  if (order === undefined) {
    throw new Error(`sponsorship ${stored.id} has no order`);
  }
  return {
    id: stored.id,
    courseId: order.courseId,
    courseTitle: findDemoCourse(order.courseId)?.title ?? order.courseId,
    amount: order.amount,
    status: contractStatusOf(stored),
    invoiceNumber: stored.invoiceNumber,
    payUrl: stored.payUrl ?? null,
    sentAt: stored.requestedAt,
    paidAt: stored.paidAt ?? null,
    inReview: stored.status === 'review',
  };
}

/**
 * The state the learner sees. A request PayPal has not confirmed may already be with the employer,
 * so it is shown as sent, open to a refresh or a cancellation; one PayPal refused is not listed.
 * One paid but not as asked is shown as sent and in review: it has opened nothing.
 */
function contractStatusOf({ status }: StoredSponsorship): Sponsorship['status'] {
  switch (status) {
    case 'sending':
    case 'unconfirmed':
    case 'review':
      return 'sent';
    case 'refused':
      return 'cancelled';
    case 'sent':
    case 'paid':
    case 'cancelled':
      return status;
  }
}
