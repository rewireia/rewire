# dashboard

The learner's control centre, loaded only when opened. Every figure on it comes from the server
for the signed-in learner; what does not exist yet is an empty state with its first step, never a
made-up number.

## Layout and tabs

- `DashboardPage.tsx` — role-guarded learner page.
- `ControlPanel.tsx`, `ControlPanel.module.css`, `dashboard-copy.ts` — the tabs (Overview, Wallet,
  Payments, Refunds, My roadmap, Calendar; the old `?tab=budget` opens Wallet) and the words of
  the dashboard in English and Spanish, with the same keys.

## Overview: the general panel

- `Overview.tsx`, `Overview.module.css` — the composition: greeting, gauges beside the wallet, the
  learning path, courses beside recent activity, readings for the region.
- `DashboardHeader.tsx` — the navy greeting with occupation, code and region, and the quick
  actions: add funds, find courses, continue learning (only with a course under way).
- `DashboardGauges.tsx`, `gauge-readings.ts` — three radial gauges (`../../components/RadialGauge`):
  AI exposure of the occupation in the ILO bands, progress of the plan, share of the wallet spent.
- `WalletCard.tsx` — balance, added and spent, the split as a bar, the latest
  movements and "Add funds with PayPal" (PayPal Sandbox: no real money moves).
- `LearningPath.tsx`, `LearningPath.module.css`, `learning-path.ts` — "Your next steps": report,
  plan, each course of the roadmap and the certificate, coloured by stage, with the next step and
  today marked and one action each. Across the page on a wide screen, down it on a phone; the rail
  is drawn once. Without a plan, the steps still to take, with no course or date invented.
- `MyCourses.tsx` — courses taken in Rewire with their lessons, and listed courses at their
  provider.
- `RecentActivity.tsx`, `recent-activity.ts` — payments, refunds and top-ups, newest first; a course
  paid from the wallet is counted once. `walletSplit` shares out the wallet for its bar.
- `ForYou.tsx`, `reading-picks.ts` — three readings from the library, the region's first.

## My roadmap

- `RoadmapTab.tsx`, `RoadmapTab.module.css` — the interactive roadmap: its figures, the plan in
  time from `../timeline/` (loaded only here), the courses chosen and "My courses" as a table;
  without an occupation, the way to start.
- `CourseTable.tsx`, `course-columns.tsx` — "My courses" in AG Grid: stage, progress, status,
  certificate, and the way back in (a listed course opens at its provider).
- `RoadmapSummary.tsx`, `roadmap-figures.ts` — end date, hours at the learner's pace, courses done,
  paid and to pay, the amount still due, and the key to the chart's colours.
- `RoadmapCards.tsx`, `RoadmapActions.tsx`, `roadmap-edit.ts` — each chosen course with its state
  and actions: pay from the wallet or with PayPal, take it out while it is not bought (the server
  keeps at least one), continue, or ask for a refund within its window.
- `LearningCalendar.tsx` — the month view of the roadmap's suggested dates.

## Payments and refunds

- `PaymentsTab.tsx` — one filter over the tables of the tab and the Sandbox notice.
- `PaymentsSection.tsx`, `payment-columns.tsx` — "My payments" (or only the refunds) in AG Grid:
  date, course, method, seller, amount, status, PayPal's reference and the action; totals pinned
  at the foot and a CSV of the history.
- `EmployerSection.tsx`, `employer-columns.tsx` — invoices sent to the employer with PayPal
  Invoicing; one still out can be checked again or cancelled, after a confirmation.
- `RefundDialog.tsx`, `ConfirmDialog.tsx` — the native modal dialog that asks before a refund or a
  cancellation; it opens with the focus on the way back.
- `payment-totals.ts` — what was paid and refunded in each currency; currencies are never added
  together. `compareMoney` sorts amounts by currency, then by amount.

## Session and tables

- `session-cache.ts` — replaces account-bound caches after login and restores the saved occupation.
- `SignIn.tsx`, `SignIn.module.css` — demo role sign-in, safe return to the plan, and sign-out with private query cleanup.
- `DashboardGrid.tsx`, `grid-modules.ts`, `use-busy.ts`, `Dashboard.module.css` — the AG Grid table
  shared with the business page, its modules, rows waiting on an action, and the tables' styles.
