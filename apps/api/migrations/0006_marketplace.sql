-- Demo allowances are spending limits, never deposited money or stored payment credentials.
CREATE TABLE market_wallets (
 learner_id TEXT NOT NULL REFERENCES learners(id), region TEXT NOT NULL,
 budget_minor INTEGER NOT NULL CHECK(budget_minor >= 0), PRIMARY KEY(learner_id, region)
) STRICT;
CREATE TABLE market_terms (
 course_id TEXT NOT NULL, region TEXT NOT NULL,
 price_minor INTEGER NOT NULL CHECK(price_minor > 0),
 minimum_minor INTEGER NOT NULL CHECK(minimum_minor > 0 AND minimum_minor <= price_minor),
 published INTEGER NOT NULL CHECK(published IN (0,1)), PRIMARY KEY(course_id,region)
) STRICT;
CREATE TABLE market_quotes (
 id TEXT PRIMARY KEY, learner_id TEXT NOT NULL REFERENCES learners(id),
 course_id TEXT NOT NULL, region TEXT NOT NULL, agreed_minor INTEGER NOT NULL CHECK(agreed_minor > 0),
 expires_at TEXT NOT NULL, payload TEXT NOT NULL,
 order_id TEXT UNIQUE REFERENCES orders(id)
) STRICT;
CREATE INDEX market_quotes_learner ON market_quotes(learner_id,region);
