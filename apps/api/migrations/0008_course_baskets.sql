-- Fixed-price baskets retain one payment and an immutable price per selected course.
CREATE TABLE order_items (
 order_id TEXT NOT NULL REFERENCES orders(id),
 course_id TEXT NOT NULL,
 amount_minor INTEGER NOT NULL CHECK(amount_minor > 0),
 PRIMARY KEY(order_id, course_id)
) STRICT;
-- A basket may hold several courses. Learner/course remains the exclusion key.
CREATE TABLE purchase_holds_basket (
 learner_id TEXT NOT NULL REFERENCES learners(id), course_id TEXT NOT NULL,
 order_id TEXT NOT NULL REFERENCES orders(id), token TEXT NOT NULL, taken_at TEXT NOT NULL,
 PRIMARY KEY(learner_id, course_id)
) STRICT;
INSERT INTO purchase_holds_basket SELECT * FROM purchase_holds;
DROP TABLE purchase_holds;
ALTER TABLE purchase_holds_basket RENAME TO purchase_holds;
CREATE INDEX holds_by_order ON purchase_holds(order_id);
