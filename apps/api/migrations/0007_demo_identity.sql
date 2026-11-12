-- One explicitly adopted learner for the shared public demo; existing learners remain intact.
CREATE TABLE demo_identity (
  name TEXT PRIMARY KEY CHECK (name = 'learner'),
  learner_id TEXT NOT NULL UNIQUE REFERENCES learners(id)
) STRICT;
