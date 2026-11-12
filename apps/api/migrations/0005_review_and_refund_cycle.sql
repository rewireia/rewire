-- A payment PayPal reported that Rewire could not read with certainty: a capture with an unknown
-- status, a currency Rewire does not sell in or fields it cannot read, or an invoice paid in part,
-- by another amount or marked as paid by hand. It is kept as received, gives no access, holds the
-- course and waits for a reconciliation. The observed values are text: they may be anything.
ALTER TABLE orders ADD COLUMN review_reason TEXT;
ALTER TABLE orders ADD COLUMN observed_status TEXT;
ALTER TABLE orders ADD COLUMN observed_currency TEXT;
ALTER TABLE orders ADD COLUMN observed_value TEXT;

-- How many refunds of the order PayPal declined after accepting them. Each new request carries a
-- new idempotency key, so a declined refund is never answered again in place of a new one.
ALTER TABLE orders ADD COLUMN refund_attempts INTEGER NOT NULL DEFAULT 0
  CHECK (refund_attempts >= 0);

-- A request whose invoice PayPal reports paid, but not as the order asked: it waits for review.
CREATE TABLE sponsorships_v3 (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL UNIQUE REFERENCES orders (id),
  invoice_id TEXT UNIQUE,
  invoice_number TEXT NOT NULL,
  pay_url TEXT,
  status TEXT NOT NULL CHECK (
    status IN ('sending', 'sent', 'unconfirmed', 'refused', 'review', 'paid', 'cancelled')
  ),
  requested_at TEXT NOT NULL,
  paid_at TEXT
) STRICT;

INSERT INTO sponsorships_v3
    (id, order_id, invoice_id, invoice_number, pay_url, status, requested_at, paid_at)
  SELECT id, order_id, invoice_id, invoice_number, pay_url, status, requested_at, paid_at
    FROM sponsorships;

DROP TABLE sponsorships;

ALTER TABLE sponsorships_v3 RENAME TO sponsorships;

-- The ledger takes four more kinds of row: a capture or an invoice put in review, a refund PayPal
-- declined after accepting it, and a partial refund made from the merchant's PayPal account,
-- recorded once by its own id. Its rows are copied as they are.
CREATE TABLE payment_events_v3 (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id TEXT NOT NULL REFERENCES orders (id),
  kind TEXT NOT NULL CHECK (
    kind IN (
      'order-opened',
      'capture-completed',
      'capture-pending',
      'capture-failed',
      'capture-mismatched',
      'capture-review',
      'refund-requested',
      'refund-failed',
      'refund-partial',
      'refund-completed',
      'invoice-sent',
      'invoice-paid',
      'invoice-review',
      'invoice-cancelled'
    )
  ),
  amount_minor INTEGER NOT NULL,
  currency TEXT NOT NULL CHECK (currency IN ('USD', 'GBP', 'EUR')),
  paypal_reference TEXT NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('checkout', 'webhook', 'reconciliation')),
  occurred_at TEXT NOT NULL,
  UNIQUE (order_id, kind, paypal_reference)
) STRICT;

INSERT INTO payment_events_v3
    (id, order_id, kind, amount_minor, currency, paypal_reference, source, occurred_at)
  SELECT id, order_id, kind, amount_minor, currency, paypal_reference, source, occurred_at
    FROM payment_events;

DROP TABLE payment_events;

ALTER TABLE payment_events_v3 RENAME TO payment_events;
