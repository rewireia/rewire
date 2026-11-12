-- One attempt to pay per learner and course. The key lets a single order hold a course: a PayPal
-- order takes it before it is captured, an invoice before it is sent. The order keeps it while it
-- is paid or its money is held, and lets it go in the transaction that fails or refunds it. The
-- token names the call that took it, so only that call lets it go.
CREATE TABLE purchase_holds (
  learner_id TEXT NOT NULL REFERENCES learners (id),
  course_id TEXT NOT NULL,
  order_id TEXT NOT NULL UNIQUE REFERENCES orders (id),
  token TEXT NOT NULL,
  taken_at TEXT NOT NULL,
  PRIMARY KEY (learner_id, course_id)
) STRICT;

-- Orders that already hold a course: paid, held by PayPal, or an invoice still out. A paid one
-- is preferred when there are several.
INSERT OR IGNORE INTO purchase_holds (learner_id, course_id, order_id, token, taken_at)
  SELECT learner_id, course_id, id, id, created_at
    FROM orders
   WHERE status IN ('completed', 'pending')
      OR (method = 'employer-invoice' AND status = 'created')
   ORDER BY CASE status WHEN 'completed' THEN 0 ELSE 1 END, created_at;

-- A sponsorship is now written before PayPal is called, so every invoice that may be paid has its
-- purchase. The invoice id is kept as soon as the draft exists, before it is sent. `sending` is a
-- request under way, `unconfirmed` one PayPal did not answer, `refused` one PayPal turned down.
CREATE TABLE sponsorships_v2 (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL UNIQUE REFERENCES orders (id),
  invoice_id TEXT UNIQUE,
  invoice_number TEXT NOT NULL,
  pay_url TEXT,
  status TEXT NOT NULL CHECK (
    status IN ('sending', 'sent', 'unconfirmed', 'refused', 'paid', 'cancelled')
  ),
  requested_at TEXT NOT NULL,
  paid_at TEXT
) STRICT;

INSERT INTO sponsorships_v2
    (id, order_id, invoice_id, invoice_number, pay_url, status, requested_at, paid_at)
  SELECT id, order_id, invoice_id, invoice_number, pay_url, status, sent_at, paid_at
    FROM sponsorships;

DROP TABLE sponsorships;

ALTER TABLE sponsorships_v2 RENAME TO sponsorships;
