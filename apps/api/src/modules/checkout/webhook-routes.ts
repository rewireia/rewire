import { Hono } from 'hono';
import { z } from 'zod';

import type { HttpEnvironment } from '../../http/environment.ts';
import { HttpProblem } from '../../http/problem.ts';
import type { Logger } from '../../logger.ts';
import type { Clock } from '../../platform/clock.ts';
import type { Database } from '../../platform/database.ts';

import type { CheckoutService } from './checkout-service.ts';
import type { Order, OrderStore } from './order-store.ts';
import { isSignedByPayPal, signatureOf, type CertificateLoader } from './webhook-signature.ts';

export interface WebhookDependencies {
  readonly checkout: CheckoutService;
  readonly orders: OrderStore;
  readonly database: Database;
  /** Ids of our webhook subscriptions at PayPal: one per merchant. */
  readonly webhookIds: readonly string[];
  readonly loadCertificate: CertificateLoader;
  /**
   * Told when PayPal reports a change in an invoice, with the id of the invoice and its reference,
   * our order id, which finds the purchase even when the invoice id was never learnt.
   */
  readonly onInvoiceEvent: (invoiceId: string, reference: string | undefined) => Promise<void>;
  /**
   * Told about a capture event of no order, with our id and PayPal's order id as the event carries
   * them: a wallet top-up is read again at PayPal and settled. Returns whether it was one.
   */
  readonly onTopUpEvent: (reference: PaymentReference) => Promise<boolean>;
  readonly clock: Clock;
  readonly logger: Logger;
}

/** The parts of a PayPal event we read. Everything else in it is ignored. */
const eventSchema = z.object({
  id: z.string().min(1),
  event_type: z.string().min(1),
  resource: z
    .object({
      id: z.string().optional(),
      custom_id: z.string().optional(),
      /** Invoice events carry the invoice inside the resource. */
      invoice: z
        .object({
          id: z.string().optional(),
          detail: z.object({ reference: z.string().optional() }).optional(),
        })
        .optional(),
      supplementary_data: z
        .object({ related_ids: z.object({ order_id: z.string().optional() }).optional() })
        .optional(),
    })
    .optional(),
});

type PayPalEvent = z.infer<typeof eventSchema>;

/** How a capture event names the payment: our id, and PayPal's id of the order. */
export interface PaymentReference {
  readonly id: string | undefined;
  readonly paypalOrderId: string | undefined;
}

const CAPTURE_EVENTS = 'PAYMENT.CAPTURE.';
const INVOICE_EVENTS = 'INVOICING.INVOICE.';
/** The events that can change an order. Any other signed event is acknowledged and ignored. */
const HANDLED_EVENTS = [CAPTURE_EVENTS, INVOICE_EVENTS] as const;

/**
 * PayPal's notifications. An event is only a hint that something changed: the order is
 * read again at PayPal before anything is recorded, so a forged or stale body cannot
 * enrol anybody.
 */
export function webhookRoutes(dependencies: WebhookDependencies): Hono<HttpEnvironment> {
  const { webhookIds, loadCertificate } = dependencies;
  const handle = createEventHandler(dependencies);

  return new Hono<HttpEnvironment>().post('/webhooks/paypal', async (context) => {
    if (webhookIds.length === 0) {
      throw new HttpProblem({
        status: 503,
        code: 'webhooks_not_configured',
        title: 'Webhooks are not set up',
      });
    }
    const body = new Uint8Array(await context.req.arrayBuffer());
    const signature = signatureOf(context.req.raw.headers);
    const checks =
      signature === undefined
        ? []
        : await Promise.all(
            webhookIds.map((id) => isSignedByPayPal(body, signature, id, loadCertificate)),
          );
    if (!checks.includes(true)) {
      throw new HttpProblem({ status: 401, code: 'invalid_signature', title: 'Invalid signature' });
    }

    const event = eventSchema.safeParse(JSON.parse(Buffer.from(body).toString('utf8')));
    if (
      event.success &&
      HANDLED_EVENTS.some((prefix) => event.data.event_type.startsWith(prefix))
    ) {
      await handle(event.data);
    }
    // PayPal retries anything but a 2xx, and every signed event has been dealt with.
    return context.body(null, 204);
  });
}

/** Deals with an event once, however many times PayPal delivers it. */
function createEventHandler({
  checkout,
  orders,
  database,
  onInvoiceEvent,
  onTopUpEvent,
  clock,
  logger,
}: WebhookDependencies): (event: PayPalEvent) => Promise<void> {
  const wasHandled = async (event: PayPalEvent): Promise<boolean> => {
    const result = await database.execute('SELECT id FROM webhook_events WHERE id = ?', [event.id]);
    return result.rows.length > 0;
  };
  const markHandled = async (event: PayPalEvent): Promise<void> => {
    await database.execute(
      'INSERT OR IGNORE INTO webhook_events (id, type, received_at) VALUES (?, ?, ?)',
      [event.id, event.event_type, clock().toISOString()],
    );
  };
  const orderOf = async ({ resource }: PayPalEvent): Promise<Order | undefined> => {
    const byOurId =
      resource?.custom_id === undefined ? undefined : await orders.find(resource.custom_id);
    const paypalOrderId = resource?.supplementary_data?.related_ids?.order_id;
    return (
      byOurId ??
      (paypalOrderId === undefined ? undefined : await orders.findByPayPalOrder(paypalOrderId)) ??
      (resource?.id === undefined ? undefined : await orders.findByCapture(resource.id))
    );
  };

  return async (event) => {
    if (await wasHandled(event)) {
      return;
    }
    if (event.event_type.startsWith(INVOICE_EVENTS)) {
      const invoiceId = event.resource?.invoice?.id ?? event.resource?.id;
      if (invoiceId !== undefined) {
        await onInvoiceEvent(invoiceId, event.resource?.invoice?.detail?.reference);
      }
    } else {
      const order = await orderOf(event);
      if (order !== undefined) {
        await checkout.reconcile(order, 'webhook');
      } else if (!(await onTopUpEvent(referenceOf(event)))) {
        logger.warn('webhook for an unknown order', { eventId: event.id, type: event.event_type });
      }
    }
    // Marked only once dealt with: if PayPal could not be read, its retry is handled again.
    // Handling an event twice is harmless, because every fact is recorded idempotently.
    await markHandled(event);
  };
}

function referenceOf({ resource }: PayPalEvent): PaymentReference {
  return {
    id: resource?.custom_id,
    paypalOrderId: resource?.supplementary_data?.related_ids?.order_id,
  };
}
