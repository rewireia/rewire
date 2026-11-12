# tests

Vitest unit tests, in the Node environment.

- `catalogues.test.ts` — English and Spanish have the same keys and placeholders.
- `format.test.ts` — points, numbers, dates and placeholders in each language.
- `client.test.ts` — the API client with a fake `fetch`: contract validation, problems, network
  failures and cancelled requests.
- `preferences.test.ts` — stored preferences are read safely; a chosen region is told from the
  default one.
- `storage.test.ts` — a browser that throws on the storage property, on a read or on a write: the
  preferences load and hold for the visit, and the opening does not play.
- `claim-certificate.test.ts` — the claim of a certificate in both orders of the reads that follow:
  one claim, one move to the certificate, none once the learner left the course.
- `opening.test.ts` — the beats of the opening and that it plays once per session, only at the
  home page, only with motion allowed and storage available.
- `route-error.test.ts` — the error page says what happened and what to do, in English and
  Spanish, with no technical detail.
- `histogram.test.ts` — the bins of the explorer histogram.
- `explore-story.test.ts` — the arithmetic of the titles of a region's data story.
- `radial-gauge.test.ts` — the geometry and the reading of the radial gauge.
- `business-figures.test.ts` — the seller's figures by day, best sellers, catalogue filters and typed prices.
- `seller-forms.test.ts` — a beacon's window in the browser's time, and the draft of a course checked with the server's rules.
- `seller-forms.test.ts` — the seller's forms: the window of a beacon in the browser's time, and the
  draft of a course as the server is sent it.
- `explore-studio.test.ts` — "Analyse": the tables built from the API's list, every field the
  shipped dashboard names exists on both pages, its language, and the saved layout with a fake
  storage.
- `explore-studio-tools.test.ts` — the occupation in focus, the occupation of a right-clicked row,
  a drill-through in words and the layout of a narrower canvas.
- `explore-analyst.test.ts` — the analyst: a turn of Studio as the server carries it and back, a
  failed turn, its instructions and its own tool's summary.
- `money.test.ts` — prices and salaries in each currency and language.
- `problems.test.ts` — every known problem code has its own text in English and Spanish.
- `guide-privacy.test.ts` — what a person is told about where their words to the guide go.
- `report-text.test.ts` — task sentences, `[T2]` references with their task and its score, the
  tasks an explanation mentions, and saved times.
- `checkout.test.ts` — what the person is told after a capture, and the pay-later sentence.
- `tables.test.ts` — the totals of "My payments" by currency, and the rows of the task table.
- `grid-columns.test.ts` — the quick filter searches what each cell shows, in both languages;
  amounts sort by currency first; a row waiting on an action carries it.
- `timeline-plan.ts` — a small plan in time, as the server answers it, for the tests below.
- `timeline.test.ts` — the plan in time: calendar days and the chart's end of a task, rows and
  arrows of the chart, gestures as changes of the plan, its sentence and its tooltip.
- `timeline-payments.test.ts` — payments on the plan in time: milestones and their arrows, states
  in words, links, courses held back, the end of the plan, stage counts and the calendar file.

- `chat-intent.test.ts` — social greetings bypass search without swallowing mixed job descriptions.
- `rex-reply.test.ts` — what Rex says after a search of the catalogue: a failure, nothing found,
  nothing more.
- `report-occupation.test.ts` — which occupation the report shows: the address first, then the
  saved one for the same region and group.
- `studio-session.test.ts` — the analyst opens its session once, before the first turn.
- `course-filter.test.ts` — the filters of the course catalogue, words found regardless of case and
  accents.
- `cart-store.test.ts` — the stored cart read safely: valid ids once each, up to the limit.
- `offers.test.ts` — the price of a course on offer: the server's while the offer runs, the list
  price once it is over.
- `wallet.test.ts` — the amount of a top-up as typed, with a point or a comma, and what the wallet
  refuses.
- `dashboard-overview.test.ts` — the learning path of the dashboard: the way still to take, the
  next step and today.
- `dashboard-roadmap.test.ts` — taking a course out of the plan keeps every other one.
- `library-filters.test.ts` — the filters of the library: the person's region and the global
  readings first.
- `ai-primer.test.ts` — the links of a paragraph of "What is AI", only to https addresses.
