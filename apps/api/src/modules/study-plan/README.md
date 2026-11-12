# study-plan

The learning plan of an occupation laid out in time, at the pace each learner sets.

```text
routes.ts               reading the plan in time, and saving the learner's pace
study-plan-service.ts   gathers the plan, the learner's pace and their progress
study-plan-store.ts     the plan each learner keeps: one, replaced whole on every save
timeline.ts             pure rules: the order of the courses and the days each one takes
course-payments.ts      where the payment of each paid course stands, from the learner's orders
plan-rules.ts           what a plan must meet to be kept, and what of it still holds later
calendar-day.ts         arithmetic on days written as `YYYY-MM-DD`
```

## Rules

- Only what the learner decides is stored: the day they start, their hours a week, and the
  courses they left out, moved or gave a length to. The dates are worked out on every
  reading, so they always follow the catalogue as it is today.
- The courses follow one another in the order of the plan, free ones first in each step.
  None starts before the one ahead of it ends, nor before the day the learner moved it to.
- A course with published hours takes those hours at the learner's weekly pace, rounded up
  to whole days. The learner cannot give it another length.
- A course whose provider publishes no length takes the days the learner books for it, and
  a week until they say.
- A paid course cannot start before it is paid for. Unpaid, it starts no earlier than today,
  so once its day has come it moves forward day by day, and the courses after it with it,
  until PayPal confirms the payment or the employer pays the invoice. Paid late, it starts
  the day it was paid for. A refund puts it back to waiting. The plan says so on each course
  (`payment`, `heldByPayment`): nothing moves without a reason the learner can read.
- Progress is shown and moves no date. It is the learner's own: every lesson and the quiz
  of a paid course count as one step each. Rewire cannot see into a free course and claims
  nothing about it.
- The courses a learner added from the catalogue (their roadmap) join the plan in the step
  they fit, after the plan's own, as paid courses with every rule above; one the plan already
  has is not added twice. They leave it when they leave the roadmap. A payment from the wallet
  counts as paid, like one through PayPal.
- A learner keeps one plan, which follows them to whatever occupation they read. What it
  says about a course that is not in the plan at hand has no effect.
- A saved plan outlives changes to the catalogue: what it says about a course that was
  withdrawn, or that has published its hours since, is dropped on reading. A plan saved
  under rules that have changed counts as none.
- A visitor reads the plan everyone starts with, from the day it is where they are, and
  becomes a learner on their first save.
