-- How a learner wants to study: the day they start, their hours a week and the courses they
-- left out, moved or gave a length to, as one JSON document replaced whole on every save.
-- The dates of the plan are worked out from it on every reading and never stored.
CREATE TABLE study_plans (
  learner_id TEXT PRIMARY KEY REFERENCES learners (id),
  plan TEXT NOT NULL,
  updated_at TEXT NOT NULL
) STRICT;
