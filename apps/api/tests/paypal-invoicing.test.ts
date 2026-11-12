import { describe, expect, it } from 'vitest';

import { createPayPalInvoicing } from '../src/modules/sponsorship/paypal-invoicing.ts';
import type { PayPalRest, RestRequest } from '../src/modules/sponsorship/paypal-rest.ts';

const VIEW_URL = 'https://www.sandbox.paypal.com/invoice/p/#INV2-1';
const REQUEST = {
  orderId: 'order-1',
  invoiceNumber: '0042',
  recipientEmail: 'boss@employer.example',
  recipientName: 'Employer Ltd',
  itemName: 'A course (demo course)',
  itemDescription: 'What it teaches.',
  amount: { currency: 'EUR' as const, minorUnits: 4900 },
  note: 'Why it is asked for.',
};

/** PayPal's REST API as a script: each request is recorded and answered by its path. */
function fakeRest(status = 'SENT', invoice?: unknown) {
  const requests: RestRequest[] = [];
  const rest: PayPalRest = {
    send(request) {
      requests.push(request);
      if (request.path.endsWith('/generate-next-invoice-number')) {
        return Promise.resolve({ invoice_number: '0042' });
      }
      if (request.path.endsWith('/send') || request.path.endsWith('/cancel')) {
        return Promise.resolve(undefined);
      }
      if (request.path.startsWith('/v2/invoicing/search-invoices')) {
        return Promise.resolve({
          items: [
            { id: 'INV2-0', status: 'SENT', detail: { reference: 'order-10' } },
            { id: 'INV2-1', status: 'SENT', detail: { reference: 'order-1' } },
          ],
        });
      }
      return Promise.resolve(
        invoice ?? {
          id: 'INV2-1',
          status: request.method === 'POST' ? 'DRAFT' : status,
          detail: {
            reference: 'order-1',
            ...(request.method === 'GET' ? { metadata: { recipient_view_url: VIEW_URL } } : {}),
          },
        },
      );
    },
  };
  return { rest, requests };
}

describe('PayPal invoicing', () => {
  it('numbers, creates and sends an invoice, each write keyed by our order id', async () => {
    const { rest, requests } = fakeRest();
    const invoicing = createPayPalInvoicing(rest);
    expect(await invoicing.nextNumber()).toBe('0042');
    expect(await invoicing.createDraft(REQUEST)).toBe('INV2-1');
    await invoicing.sendDraft('INV2-1', REQUEST.orderId);
    expect(
      requests.map(({ method, path, idempotencyKey }) => [method, path, idempotencyKey]),
    ).toEqual([
      ['POST', '/v2/invoicing/generate-next-invoice-number', undefined],
      ['POST', '/v2/invoicing/invoices', 'invoice-order-1'],
      ['POST', '/v2/invoicing/invoices/INV2-1/send', 'send-order-1'],
    ]);
  });

  it('finds the invoice of an order by its reference, and only that one', async () => {
    const { rest, requests } = fakeRest();
    expect(await createPayPalInvoicing(rest).findByReference('order-1')).toEqual({
      invoiceId: 'INV2-1',
      state: 'sent',
      payUrl: VIEW_URL,
      reference: 'order-1',
      paid: undefined,
      observed: { status: 'SENT', currency: undefined, value: undefined },
    });
    expect(requests[0]?.body).toEqual({ reference: 'order-1' });
    expect(await createPayPalInvoicing(rest).findByReference('order-2')).toBeUndefined();
  });

  it('says a draft whose answer it cannot read may exist', async () => {
    const { rest } = fakeRest('SENT', { unexpected: true });
    await expect(createPayPalInvoicing(rest).createDraft(REQUEST)).rejects.toMatchObject({
      issue: 'INVOICE_UNREADABLE',
      outcome: 'unknown',
    });
  });

  it('writes the amount, the note, the recipient and our order id on the invoice', async () => {
    const { rest, requests } = fakeRest();
    await createPayPalInvoicing(rest).createDraft(REQUEST);
    expect(requests[0]?.body).toEqual({
      detail: {
        invoice_number: '0042',
        reference: 'order-1',
        currency_code: 'EUR',
        note: 'Why it is asked for.',
      },
      primary_recipients: [
        {
          billing_info: { email_address: 'boss@employer.example', business_name: 'Employer Ltd' },
        },
      ],
      items: [
        {
          name: 'A course (demo course)',
          description: 'What it teaches.',
          quantity: '1',
          unit_amount: { currency_code: 'EUR', value: '49.00' },
        },
      ],
    });
  });

  // Only PAID says the whole invoice was paid through PayPal. Paid in part, or marked as paid by
  // hand from the merchant's account, carries no payment Rewire can check: it goes to review.
  it.each([
    ['DRAFT', 'draft'],
    ['PAID', 'paid'],
    ['MARKED_AS_PAID', 'review'],
    ['CANCELLED', 'cancelled'],
    ['SENT', 'sent'],
    ['PARTIALLY_PAID', 'review'],
    ['UNPAID', 'sent'],
  ])('reads PayPal state %s as %s', async (status, state) => {
    const { rest } = fakeRest(status);
    expect(await createPayPalInvoicing(rest).readInvoice('INV2-1')).toMatchObject({
      invoiceId: 'INV2-1',
      state,
      payUrl: VIEW_URL,
      reference: 'order-1',
    });
  });

  it('reads what PayPal reports paid, and keeps it as text when it is not a currency it sells in', async () => {
    const paidIn = (currency: string, value: string) =>
      fakeRest('PAID', {
        id: 'INV2-1',
        status: 'PAID',
        detail: { reference: 'order-1' },
        payments: { paid_amount: { currency_code: currency, value } },
      }).rest;
    expect(await createPayPalInvoicing(paidIn('USD', '19.00')).readInvoice('INV2-1')).toMatchObject(
      {
        state: 'paid',
        paid: { currency: 'USD', minorUnits: 1900 },
        observed: { status: 'PAID', currency: 'USD', value: '19.00' },
      },
    );
    expect(await createPayPalInvoicing(paidIn('JPY', '100')).readInvoice('INV2-1')).toMatchObject({
      state: 'paid',
      paid: undefined,
      observed: { status: 'PAID', currency: 'JPY', value: '100' },
    });
  });

  it('cancels an invoice and tells its recipient, with a key of its own', async () => {
    const { rest, requests } = fakeRest();
    await createPayPalInvoicing(rest).cancelInvoice('INV2-1');
    expect(requests).toEqual([
      {
        method: 'POST',
        path: '/v2/invoicing/invoices/INV2-1/cancel',
        idempotencyKey: 'cancel-INV2-1',
        body: { send_to_recipient: true, send_to_invoicer: false },
      },
    ]);
  });

  it('refuses an invoice it cannot read', async () => {
    const { rest } = fakeRest('SENT', { unexpected: true });
    await expect(createPayPalInvoicing(rest).readInvoice('INV2-1')).rejects.toMatchObject({
      issue: 'INVOICE_UNREADABLE',
    });
  });

  it('refuses an invoice number it cannot read', async () => {
    const rest: PayPalRest = { send: () => Promise.resolve({}) };
    await expect(createPayPalInvoicing(rest).nextNumber()).rejects.toMatchObject({
      issue: 'INVOICE_NUMBER_UNREADABLE',
    });
  });
});
