-- Learners. Rewire keeps the occupation a learner confirmed and the time they give to each
-- task, never the free text they typed.
CREATE TABLE learners (
  id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL,
  certificate_name TEXT,
  region TEXT CHECK (region IN ('eu', 'us', 'uk')),
  occupation_code TEXT,
  occupation_title TEXT,
  isco08 TEXT,
  time_by_task TEXT NOT NULL DEFAULT '{}'
) STRICT;

-- One purchase of one course. The amount is fixed by the server when the order is opened.
CREATE TABLE orders (
  id TEXT PRIMARY KEY,
  learner_id TEXT NOT NULL REFERENCES learners (id),
  course_id TEXT NOT NULL,
  region TEXT NOT NULL CHECK (region IN ('eu', 'us', 'uk')),
  method TEXT NOT NULL CHECK (method IN ('paypal', 'employer-invoice')),
  currency TEXT NOT NULL CHECK (currency IN ('USD', 'GBP', 'EUR')),
  amount_minor INTEGER NOT NULL CHECK (amount_minor > 0),
  status TEXT NOT NULL CHECK (status IN ('created', 'pending', 'completed', 'failed', 'refunded')),
  paypal_order_id TEXT UNIQUE,
  paypal_capture_id TEXT UNIQUE,
  created_at TEXT NOT NULL,
  paid_at TEXT,
  refunded_at TEXT
) STRICT;

CREATE INDEX orders_by_learner ON orders (learner_id, created_at);

-- The ledger: one row for every step of an order, never updated or deleted. The amount is
-- signed: positive when money comes in, negative when it goes back, zero for a step that
-- moves none. The unique key makes recording the same PayPal fact twice a no-op.
CREATE TABLE payment_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id TEXT NOT NULL REFERENCES orders (id),
  kind TEXT NOT NULL CHECK (
    kind IN (
      'order-opened',
      'capture-completed',
      'capture-pending',
      'capture-failed',
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

-- Access to a course. Created only when its order is paid; revoked when it is refunded.
CREATE TABLE enrolments (
  id TEXT PRIMARY KEY,
  learner_id TEXT NOT NULL REFERENCES learners (id),
  course_id TEXT NOT NULL,
  order_id TEXT NOT NULL REFERENCES orders (id),
  status TEXT NOT NULL CHECK (status IN ('active', 'completed', 'revoked')),
  started_at TEXT NOT NULL,
  quiz_passed_at TEXT,
  completed_at TEXT,
  UNIQUE (learner_id, course_id)
) STRICT;

CREATE TABLE lesson_progress (
  enrolment_id TEXT NOT NULL REFERENCES enrolments (id),
  lesson_id TEXT NOT NULL,
  completed_at TEXT NOT NULL,
  PRIMARY KEY (enrolment_id, lesson_id)
) STRICT;

-- A certificate is public by its id. It carries the name the learner asked for.
CREATE TABLE certificates (
  id TEXT PRIMARY KEY,
  enrolment_id TEXT NOT NULL UNIQUE REFERENCES enrolments (id),
  learner_name TEXT NOT NULL,
  course_id TEXT NOT NULL,
  course_title TEXT NOT NULL,
  hours REAL NOT NULL,
  issued_on TEXT NOT NULL
) STRICT;

-- A PayPal invoice sent to an employer. The employer's address goes to PayPal and is not
-- kept here.
CREATE TABLE sponsorships (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL UNIQUE REFERENCES orders (id),
  invoice_id TEXT NOT NULL UNIQUE,
  invoice_number TEXT NOT NULL,
  pay_url TEXT,
  status TEXT NOT NULL CHECK (status IN ('sent', 'paid', 'cancelled')),
  sent_at TEXT NOT NULL,
  paid_at TEXT
) STRICT;

-- PayPal may deliver a webhook more than once: each event is handled the first time only.
CREATE TABLE webhook_events (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  received_at TEXT NOT NULL
) STRICT;
