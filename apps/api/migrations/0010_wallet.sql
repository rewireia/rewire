-- Money a learner adds to their wallet with PayPal, one row per top-up. It counts toward the
-- balance only once PayPal reports it captured, for exactly the amount asked. A capture held by
-- PayPal waits as `pending`; one that does not match is kept with what it took and given back.
CREATE TABLE wallet_top_ups (
  id TEXT PRIMARY KEY,
  learner_id TEXT NOT NULL REFERENCES learners (id),
  region TEXT NOT NULL CHECK (region IN ('eu', 'us', 'uk')),
  currency TEXT NOT NULL CHECK (currency IN ('USD', 'GBP', 'EUR')),
  amount_minor INTEGER NOT NULL CHECK (amount_minor BETWEEN 500 AND 50000),
  status TEXT NOT NULL CHECK (
    status IN ('created', 'pending', 'completed', 'failed', 'mismatched', 'refunded')
  ),
  paypal_order_id TEXT UNIQUE,
  paypal_capture_id TEXT UNIQUE,
  captured_minor INTEGER,
  captured_currency TEXT CHECK (captured_currency IN ('USD', 'GBP', 'EUR')),
  refund_id TEXT,
  created_at TEXT NOT NULL,
  completed_at TEXT
) STRICT;

CREATE INDEX wallet_top_ups_by_learner ON wallet_top_ups (learner_id, region, created_at);

-- An order may now be paid from the wallet balance. The table is rebuilt to widen its check, with
-- every foreign key still enforced: they are deferred to the end of this transaction, the rows are
-- set aside, and the tables that refer to `orders` find every one of them again under that name.
PRAGMA defer_foreign_keys = ON;

CREATE TABLE orders_before_wallet AS SELECT * FROM orders;

DROP TABLE orders;

CREATE TABLE orders (
  id TEXT PRIMARY KEY,
  learner_id TEXT NOT NULL REFERENCES learners (id),
  course_id TEXT NOT NULL,
  region TEXT NOT NULL CHECK (region IN ('eu', 'us', 'uk')),
  method TEXT NOT NULL CHECK (method IN ('paypal', 'employer-invoice', 'wallet')),
  currency TEXT NOT NULL CHECK (currency IN ('USD', 'GBP', 'EUR')),
  amount_minor INTEGER NOT NULL CHECK (amount_minor > 0),
  status TEXT NOT NULL CHECK (status IN ('created', 'pending', 'completed', 'failed', 'refunded')),
  paypal_order_id TEXT UNIQUE,
  paypal_capture_id TEXT UNIQUE,
  created_at TEXT NOT NULL,
  paid_at TEXT,
  refunded_at TEXT,
  captured_minor INTEGER,
  captured_currency TEXT CHECK (captured_currency IN ('USD', 'GBP', 'EUR')),
  capture_mismatch INTEGER NOT NULL DEFAULT 0 CHECK (capture_mismatch IN (0, 1)),
  refund_id TEXT,
  refund_status TEXT CHECK (refund_status IN ('pending', 'completed')),
  refund_requested_at TEXT,
  review_reason TEXT,
  observed_status TEXT,
  observed_currency TEXT,
  observed_value TEXT,
  refund_attempts INTEGER NOT NULL DEFAULT 0 CHECK (refund_attempts >= 0)
) STRICT;

INSERT INTO orders
    (id, learner_id, course_id, region, method, currency, amount_minor, status, paypal_order_id,
     paypal_capture_id, created_at, paid_at, refunded_at, captured_minor, captured_currency,
     capture_mismatch, refund_id, refund_status, refund_requested_at, review_reason,
     observed_status, observed_currency, observed_value, refund_attempts)
  SELECT id, learner_id, course_id, region, method, currency, amount_minor, status,
         paypal_order_id, paypal_capture_id, created_at, paid_at, refunded_at, captured_minor,
         captured_currency, capture_mismatch, refund_id, refund_status, refund_requested_at,
         review_reason, observed_status, observed_currency, observed_value, refund_attempts
    FROM orders_before_wallet;

DROP TABLE orders_before_wallet;

CREATE INDEX orders_by_learner ON orders (learner_id, created_at);

CREATE UNIQUE INDEX orders_by_refund ON orders (refund_id);

-- The ledger takes one more kind of row: a payment made from the wallet balance. A refund of it
-- is a `refund-completed` row, as any other. Its rows are copied as they are.
CREATE TABLE payment_events_v4 (
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
      'invoice-cancelled',
      'wallet-paid'
    )
  ),
  amount_minor INTEGER NOT NULL,
  currency TEXT NOT NULL CHECK (currency IN ('USD', 'GBP', 'EUR')),
  paypal_reference TEXT NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('checkout', 'webhook', 'reconciliation')),
  occurred_at TEXT NOT NULL,
  UNIQUE (order_id, kind, paypal_reference)
) STRICT;

INSERT INTO payment_events_v4
    (id, order_id, kind, amount_minor, currency, paypal_reference, source, occurred_at)
  SELECT id, order_id, kind, amount_minor, currency, paypal_reference, source, occurred_at
    FROM payment_events;

DROP TABLE payment_events;

ALTER TABLE payment_events_v4 RENAME TO payment_events;

-- A spending limit typed by hand is no longer the balance: the balance is what PayPal captured.
DROP TABLE market_wallets;
