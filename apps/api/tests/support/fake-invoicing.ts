import { currencySchema } from '@rewire/contracts';

import { PaymentGatewayError } from '../../src/modules/checkout/gateway.ts';
import { fromDecimalAmount, toDecimalAmount } from '../../src/modules/checkout/money.ts';
import type {
  InvoiceRequest,
  InvoiceStanding,
  InvoiceState,
  InvoicingGateway,
} from '../../src/modules/sponsorship/invoicing.ts';

/** PayPal invoicing in memory: it keeps the invoices it made and changes them when told to. */
export interface FakeInvoicing extends InvoicingGateway {
  /** Every invoice sent to its recipient, as Rewire asked for it. */
  readonly sent: InvoiceRequest[];
  /** The ids of the invoices PayPal holds, drafts included, in the order they were made. */
  readonly ids: string[];
  /** The employer paid the invoice in full. */
  pay(invoiceId: string): void;
  /**
   * PayPal reports the invoice with this status and paid amount: paid in part, by another amount
   * or currency, or marked as paid by hand. `PAID` with the full amount is the same as `pay`.
   */
  payAs(invoiceId: string, payment: FakePayment): void;
  /** The invoice was cancelled at PayPal. */
  cancel(invoiceId: string): void;
  /** The next call, or the next call of one kind, is refused with PayPal's code for it. */
  failNext(issue: string, call?: InvoicingCall): void;
  /** The next call of one kind takes effect at PayPal, but its answer never comes back. */
  loseNextAnswer(call: InvoicingCall): void;
  /** The next call of one kind never reaches PayPal, and no answer comes back. */
  dropNext(call: InvoicingCall): void;
  /** The next call of one kind takes effect, and the server stops before it hears the answer. */
  stopAfterNext(call: InvoicingCall): void;
  readonly calls: Record<InvoicingCall, number>;
}

/** The calls Rewire makes to the invoicing, counted by the fake. */
type InvoicingCall = 'numbered' | 'created' | 'sent' | 'read' | 'found' | 'cancelled';

/** What goes wrong with the next call of a kind, as the test set it. */
type Mishap =
  | { readonly kind: 'refused'; readonly issue: string; readonly call: InvoicingCall | undefined }
  | { readonly kind: 'lost' | 'dropped' | 'stopped'; readonly call: InvoicingCall };

/** A status and a paid amount of an invoice, as PayPal writes them. */
interface FakePayment {
  readonly status: string;
  readonly currency: string;
  readonly value: string;
}

interface FakeInvoice {
  readonly request: InvoiceRequest;
  state: InvoiceState;
  payment: FakePayment | undefined;
}

/** Stands for PayPal's refusal to cancel an invoice that is no longer open. */
const NOT_CANCELLABLE = 'INVOICE_NOT_CANCELLABLE';

/** The address of the page to pay a fake invoice on: it ends with the invoice id. */
const payUrlOf = (invoiceId: string) => `https://www.sandbox.paypal.com/invoice/p/#${invoiceId}`;

/** Stands for the server stopping in the middle of a request. */
class ServerStopped extends Error {
  override readonly name = 'ServerStopped';
}

export function createFakeInvoicing(): FakeInvoicing {
  const invoices = new Map<string, FakeInvoice>();
  const sent: InvoiceRequest[] = [];
  const calls: Record<InvoicingCall, number> = {
    numbered: 0,
    created: 0,
    sent: 0,
    read: 0,
    found: 0,
    cancelled: 0,
  };
  let mishap: Mishap | undefined;

  /** Counts a call and runs it, unless the test said it fails, before or after its effect. */
  const called = <Result>(call: InvoicingCall, effect: () => Result): Result => {
    calls[call] += 1;
    const now = mishap !== undefined && (mishap.call ?? call) === call ? mishap : undefined;
    if (now === undefined) {
      return effect();
    }
    mishap = undefined;
    if (now.kind === 'refused') {
      throw new PaymentGatewayError(now.issue, 'DEBUG-TEST');
    }
    if (now.kind !== 'dropped') {
      effect();
    }
    throw now.kind !== 'stopped'
      ? new PaymentGatewayError('UNREACHABLE', undefined, 'unknown')
      : new ServerStopped(`stopped after the call ${call}`);
  };
  const invoiceAt = (invoiceId: string): FakeInvoice => {
    const invoice = invoices.get(invoiceId);
    if (invoice === undefined) {
      throw new PaymentGatewayError('RESOURCE_NOT_FOUND');
    }
    return invoice;
  };
  const standingOf = (invoiceId: string): InvoiceStanding => {
    const { state, request, payment } = invoiceAt(invoiceId);
    const currency = currencySchema.safeParse(payment?.currency);
    return {
      invoiceId,
      state,
      payUrl: state === 'draft' ? undefined : payUrlOf(invoiceId),
      reference: request.orderId,
      paid: currency.success ? fromDecimalAmount(payment?.value ?? '', currency.data) : undefined,
      observed: {
        status: payment?.status ?? state.toUpperCase(),
        currency: payment?.currency,
        value: payment?.value,
      },
    };
  };

  return {
    sent,
    calls,
    get ids() {
      return [...invoices.keys()];
    },
    nextNumber: async () =>
      Promise.resolve(called('numbered', () => String(invoices.size + 1).padStart(4, '0'))),
    createDraft: async (request) =>
      Promise.resolve(called('created', () => createDraft(invoices, request))),
    async sendDraft(invoiceId) {
      called('sent', () => {
        const invoice = invoiceAt(invoiceId);
        if (invoice.state === 'draft') {
          invoice.state = 'sent';
          sent.push(invoice.request);
        }
      });
      return Promise.resolve();
    },
    readInvoice: async (invoiceId) => Promise.resolve(called('read', () => standingOf(invoiceId))),
    findByReference: async (orderId) =>
      Promise.resolve(
        called('found', () => {
          const found = [...invoices].find(([, { request }]) => request.orderId === orderId);
          return found === undefined ? undefined : standingOf(found[0]);
        }),
      ),
    async cancelInvoice(invoiceId) {
      called('cancelled', () => {
        if (invoiceAt(invoiceId).state !== 'sent') {
          throw new PaymentGatewayError(NOT_CANCELLABLE);
        }
        invoiceAt(invoiceId).state = 'cancelled';
      });
      return Promise.resolve();
    },
    pay: (invoiceId) => {
      const invoice = invoiceAt(invoiceId);
      const { currency, minorUnits } = invoice.request.amount;
      invoice.state = 'paid';
      invoice.payment = {
        status: 'PAID',
        currency,
        value: toDecimalAmount({ currency, minorUnits }),
      };
    },
    payAs: (invoiceId, payment) => {
      const invoice = invoiceAt(invoiceId);
      invoice.state = payment.status === 'PAID' ? 'paid' : 'review';
      invoice.payment = payment;
    },
    cancel: (invoiceId) => {
      invoiceAt(invoiceId).state = 'cancelled';
    },
    failNext(issue, call) {
      mishap = { kind: 'refused', issue, call };
    },
    loseNextAnswer(call) {
      mishap = { kind: 'lost', call };
    },
    dropNext(call) {
      mishap = { kind: 'dropped', call };
    },
    stopAfterNext(call) {
      mishap = { kind: 'stopped', call };
    },
  };
}

/** A draft, made once per order as PayPal does for a repeated request with the same key. */
function createDraft(invoices: Map<string, FakeInvoice>, request: InvoiceRequest): string {
  const existing = [...invoices].find(([, invoice]) => invoice.request.orderId === request.orderId);
  if (existing !== undefined) {
    return existing[0];
  }
  const invoiceId = `INV2-TEST-${String(invoices.size + 1).padStart(4, '0')}`;
  invoices.set(invoiceId, { request, state: 'draft', payment: undefined });
  return invoiceId;
}
