import type { Money } from '@rewire/contracts';

import type { ObservedPayment } from '../checkout/gateway.ts';

/** An invoice for one course, addressed to the learner's employer. */
export interface InvoiceRequest {
  /** Our order id: PayPal keeps it on the invoice as its reference, and it keys every write. */
  readonly orderId: string;
  readonly invoiceNumber: string;
  readonly recipientEmail: string;
  readonly recipientName: string | undefined;
  readonly itemName: string;
  readonly itemDescription: string;
  readonly amount: Money;
  /** Shown to the employer on the invoice: why the training is being asked for. */
  readonly note: string;
}

/**
 * `draft` is not yet sent, so nobody can pay it; `sent` may be paid; `paid` was paid in full
 * through PayPal; `review` was paid in part or marked as paid by hand, with no full payment seen.
 */
export type InvoiceState = 'draft' | 'sent' | 'paid' | 'review' | 'cancelled';

/** How an invoice stands at PayPal. */
export interface InvoiceStanding {
  readonly invoiceId: string;
  readonly state: InvoiceState;
  /** The page where the recipient reads and pays the invoice, once PayPal gives one. */
  readonly payUrl: string | undefined;
  /** The invoice's reference: our order id, as Rewire wrote it. */
  readonly reference: string | undefined;
  /** What PayPal reports paid on the invoice, when it is in a currency Rewire sells in. */
  readonly paid: Money | undefined;
  /** PayPal's status and paid amount as sent, kept when the payment goes to review. */
  readonly observed: ObservedPayment;
}

/**
 * Invoices, as the sponsorship needs them, one step per call so that each step can be recorded
 * before the next. PayPal implements it in production and a fake does in tests.
 */
export interface InvoicingGateway {
  /** The number the next invoice of the merchant may take. It creates nothing. */
  nextNumber(): Promise<string>;
  /** Creates the invoice as a draft, which nobody can pay yet, and returns its id. */
  createDraft(request: InvoiceRequest): Promise<string>;
  /** Sends a draft to its recipient, who may pay it from then on. Safe to repeat. */
  sendDraft(invoiceId: string, orderId: string): Promise<void>;
  readInvoice(invoiceId: string): Promise<InvoiceStanding>;
  /** The invoice whose reference is our order id, when PayPal has one. */
  findByReference(orderId: string): Promise<InvoiceStanding | undefined>;
  /** Cancels an invoice that is still open and tells its recipient. */
  cancelInvoice(invoiceId: string): Promise<void>;
}
