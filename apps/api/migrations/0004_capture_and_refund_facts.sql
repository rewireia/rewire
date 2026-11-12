-- What PayPal really captured, when Rewire knows it from a capture it holds or one that does not
-- match the order. A capture that does not match is kept, with its amount, until its refund is
-- confirmed: it never gives access.
ALTER TABLE orders ADD COLUMN captured_minor INTEGER;
ALTER TABLE orders ADD COLUMN captured_currency TEXT CHECK (captured_currency IN ('USD', 'GBP', 'EUR'));
ALTER TABLE orders ADD COLUMN capture_mismatch INTEGER NOT NULL DEFAULT 0
  CHECK (capture_mismatch IN (0, 1));

-- A refund asked of PayPal: its id and whether PayPal has sent the money back.
ALTER TABLE orders ADD COLUMN refund_id TEXT;
ALTER TABLE orders ADD COLUMN refund_status TEXT CHECK (refund_status IN ('pending', 'completed'));
ALTER TABLE orders ADD COLUMN refund_requested_at TEXT;
CREATE UNIQUE INDEX orders_by_refund ON orders (refund_id);

-- A held capture now keeps its id on the order, as a paid one does. Orders held before this
-- migration find it in their ledger.
UPDATE orders
   SET paypal_capture_id = (
         SELECT paypal_reference FROM payment_events
          WHERE payment_events.order_id = orders.id AND kind = 'capture-pending'
          ORDER BY id LIMIT 1
       )
 WHERE status = 'pending' AND method = 'paypal' AND paypal_capture_id IS NULL;

-- The ledger takes two more kinds of row: a capture that does not match its order, and a refund
-- PayPal accepted but has not completed. Its rows are copied as they are.
CREATE TABLE payment_events_v2 (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id TEXT NOT NULL REFERENCES orders (id),
  kind TEXT NOT NULL CHECK (
    kind IN (
      'order-opened',
      'capture-completed',
      'capture-pending',
      'capture-failed',
      'capture-mismatched',
      'refund-requested',
      'refund-completed',
      'invoice-sent',
      'invoice-paid',
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

INSERT INTO payment_events_v2
    (id, order_id, kind, amount_minor, currency, paypal_reference, source, occurred_at)
  SELECT id, order_id, kind, amount_minor, currency, paypal_reference, source, occurred_at
    FROM payment_events;

DROP TABLE payment_events;

ALTER TABLE payment_events_v2 RENAME TO payment_events;
