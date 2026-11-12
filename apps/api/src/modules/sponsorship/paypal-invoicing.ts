import { currencySchema } from '@rewire/contracts';
import { z } from 'zod';

import { PaymentGatewayError } from '../checkout/gateway.ts';
import { fromDecimalAmount, toDecimalAmount } from '../checkout/money.ts';

import type {
  InvoiceRequest,
  InvoiceStanding,
  InvoiceState,
  InvoicingGateway,
} from './invoicing.ts';
import type { PayPalRest } from './paypal-rest.ts';

/** An amount as PayPal writes it. Read as text: its currency may be any. */
const amountSchema = z.object({ currency_code: z.string(), value: z.string() });

/** The parts of a PayPal invoice we read. */
const invoiceSchema = z.object({
  id: z.string().min(1),
  status: z.string().min(1),
  detail: z.object({
    reference: z.string().optional(),
    metadata: z.object({ recipient_view_url: z.url().optional() }).optional(),
  }),
  /** What has been paid on the invoice, through PayPal or recorded by hand. */
  payments: z.object({ paid_amount: amountSchema.optional() }).optional(),
});

type PayPalInvoice = z.infer<typeof invoiceSchema>;

const nextNumberSchema = z.object({ invoice_number: z.string().min(1) });
const searchSchema = z.object({ items: z.array(invoiceSchema).default([]) });

/**
 * PayPal names many states; for a sponsorship five matter. Only `PAID` says the whole invoice was
 * paid through PayPal. One paid in part, or marked as paid by hand from the merchant's account,
 * carries no payment Rewire can check, so it goes to review.
 */
function stateOf(status: string): InvoiceState {
  switch (status) {
    case 'DRAFT':
      return 'draft';
    case 'PAID':
      return 'paid';
    case 'MARKED_AS_PAID':
    case 'PARTIALLY_PAID':
      return 'review';
    case 'CANCELLED':
      return 'cancelled';
    default:
      return 'sent';
  }
}

function standingOf(invoice: PayPalInvoice): InvoiceStanding {
  const paid = invoice.payments?.paid_amount;
  const currency = currencySchema.safeParse(paid?.currency_code);
  return {
    invoiceId: invoice.id,
    state: stateOf(invoice.status),
    payUrl: invoice.detail.metadata?.recipient_view_url,
    reference: invoice.detail.reference,
    paid: currency.success ? fromDecimalAmount(paid?.value ?? '', currency.data) : undefined,
    observed: { status: invoice.status, currency: paid?.currency_code, value: paid?.value },
  };
}

/**
 * PayPal Invoicing v2 as the invoicing gateway. The writes carry keys derived from our order id,
 * so a request repeated after a timeout has the effect of one.
 */
export function createPayPalInvoicing(rest: PayPalRest): InvoicingGateway {
  return {
    async nextNumber() {
      const numbered = nextNumberSchema.safeParse(
        await rest.send({ method: 'POST', path: '/v2/invoicing/generate-next-invoice-number' }),
      );
      if (!numbered.success) {
        throw new PaymentGatewayError('INVOICE_NUMBER_UNREADABLE');
      }
      return numbered.data.invoice_number;
    },
    async createDraft(request) {
      const draft = invoiceSchema.safeParse(
        await rest.send({
          method: 'POST',
          path: '/v2/invoicing/invoices',
          idempotencyKey: `invoice-${request.orderId}`,
          body: invoiceBodyOf(request),
        }),
      );
      if (!draft.success) {
        // PayPal answered success, so the draft exists, under an id we could not read.
        throw new PaymentGatewayError('INVOICE_UNREADABLE', undefined, 'unknown');
      }
      return draft.data.id;
    },
    async sendDraft(invoiceId, orderId) {
      await rest.send({
        method: 'POST',
        path: `/v2/invoicing/invoices/${invoiceId}/send`,
        idempotencyKey: `send-${orderId}`,
        body: { send_to_recipient: true, send_to_invoicer: false },
      });
    },
    readInvoice: async (invoiceId) => standingOf(await readInvoice(rest, invoiceId)),
    findByReference: (orderId) => findByReference(rest, orderId),
    async cancelInvoice(invoiceId) {
      // PayPal answers 204 with no body. The employer is told, so they do not pay it later.
      await rest.send({
        method: 'POST',
        path: `/v2/invoicing/invoices/${invoiceId}/cancel`,
        idempotencyKey: `cancel-${invoiceId}`,
        body: { send_to_recipient: true, send_to_invoicer: false },
      });
    },
  };
}

async function readInvoice(rest: PayPalRest, invoiceId: string): Promise<PayPalInvoice> {
  const answer = await rest.send({ method: 'GET', path: `/v2/invoicing/invoices/${invoiceId}` });
  const invoice = invoiceSchema.safeParse(answer);
  if (!invoice.success) {
    throw new PaymentGatewayError('INVOICE_UNREADABLE', undefined, 'unknown');
  }
  return invoice.data;
}

/** Searches the merchant's invoices by our order id, and keeps only an exact match. */
async function findByReference(
  rest: PayPalRest,
  orderId: string,
): Promise<InvoiceStanding | undefined> {
  const answer = searchSchema.safeParse(
    await rest.send({
      method: 'POST',
      path: '/v2/invoicing/search-invoices?page=1&page_size=20&total_required=false',
      body: { reference: orderId },
    }),
  );
  if (!answer.success) {
    throw new PaymentGatewayError('INVOICE_SEARCH_UNREADABLE', undefined, 'unknown');
  }
  const found = answer.data.items.find((invoice) => invoice.detail.reference === orderId);
  return found === undefined ? undefined : standingOf(await readInvoice(rest, found.id));
}

/** The invoice as PayPal creates it: one item, our order id as its reference. */
function invoiceBodyOf(request: InvoiceRequest) {
  const amount = { currency_code: request.amount.currency, value: toDecimalAmount(request.amount) };
  return {
    detail: {
      invoice_number: request.invoiceNumber,
      reference: request.orderId,
      currency_code: request.amount.currency,
      note: request.note,
    },
    primary_recipients: [
      {
        billing_info: {
          email_address: request.recipientEmail,
          ...(request.recipientName === undefined ? {} : { business_name: request.recipientName }),
        },
      },
    ],
    items: [
      {
        name: request.itemName,
        description: request.itemDescription,
        quantity: '1',
        unit_amount: amount,
      },
    ],
  };
}
