-- Saved selections, separate from access: only a settled payment grants an enrolment.
CREATE TABLE learning_roadmap (
 learner_id TEXT NOT NULL REFERENCES learners(id), region TEXT NOT NULL,
 course_id TEXT NOT NULL, PRIMARY KEY(learner_id, region, course_id)
) STRICT;
