# report

The exposure report of an occupation, read for the person's own week.

- `ReportPage.tsx` — reads the address and loads the report.
- `ReportView.tsx` — the page: header, figures, week split, explanation, tasks, labour market,
  and the way to the plan. Methodological limits live on the method page and credits on `/credits`. It reads saved journey weights and requests the corresponding weighted score without editing the profile.
- `ReportSummary.tsx` — assembles the figures, task counts and interactive comparisons.
- `Figures.tsx` — "Your week", "Level" and "Standing", each with its sentence.
- `WeekSplit.tsx` — an AG Charts donut of the week or task counts by band, with tooltips and a textual legend. Exposure bands use red, orange, yellow and green from high to very low.
- `TaskComparison.tsx` — the five most exposed published tasks, with their scores and bands.
- `ExposureComparison.tsx`, `ExposureBarChart.tsx` — AG Charts comparisons of the personal week,
  the occupational mean and published task scores, with text equivalents.
- `TaskSection.tsx` — AG Grid on every screen, with no list/table switch.
- `TaskTable.tsx`, `task-columns.tsx`, `task-rows.ts`, `task-grid-modules.ts`, `BandFilter.tsx` —
  the tasks in a read-only AG Grid with three visible columns, a band filter and sorting. No download or detail control is shown. Saved task weights change through the journey, never from this report.
- `Labour.tsx` — "Your labour market": employment and pay, each saying what it counts and where
  it comes from. Opened without a regional occupation, it shows what is published by group.
- `Explanation.tsx`, `references.ts` — "In plain words": the guide's checked text, written in
  words only, generated once and kept in a collapsible card. Each `[T2]` becomes a link to the task with its score from the report; the tasks it
  mentions follow with their score and band, and a fixed note says that exposure is
  technical potential, not a prediction about anyone's job.
- `bands.ts` — the order of the bands.

- `ReportFacts.tsx` — official, selected and expert-reviewed task counts from the report.

- `times.ts` — saved relative task weights.
