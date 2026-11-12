# plan

The learning plan of an occupation in a region.

- `PlanPage.tsx` — connects the report to training: the tasks the plan is about, then Rex's three
  courses at fixed prices.
- `PlanFocus.tsx` — "Where AI can do most" and "Where AI can do least": up to three tasks each,
  never the same task twice; the second block is left out when no task remains for it.
- `TrainingSelection.tsx` and `TrainingSelection.module.css` — the budget-first search, what the wallet holds, and explicit course selection.
- `TrainingQuestions.tsx` — the three questions, one at a time: budget, starting point and weekly time.
- `TrainingResults.tsx` — the three courses to pick from, the total of the selection, and the way to pay for it.
- `TrainingCheckout.tsx`, `TrainingCheckout.module.css` — pays the selection from the wallet or with PayPal.
- `training-copy.ts` — the words of the training steps in English and Spanish, with the same keys.
- `CourseCardView.tsx` — a paid course of the demonstration catalogue, always marked "Demo".
- `PayLaterNote.tsx`, `pay-later.ts` — the pay-later products PayPal documents for a price.
- `Plan.module.css` — the styles of the plan and the course cards.
