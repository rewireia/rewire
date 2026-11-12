# i18n

Typed message catalogues for the interface.

- `en.ts` — the source of truth: every key and its English text, joined from `en-journey.ts`
  (home, report, plan, course, payment, problems), `en-timeline.ts` (the plan in time),
  `en-studio.ts` (the explorer's "Analyse" dashboard), `en-insights.ts` (the data story of a region
  in Explore), `en-account.ts` (study, certificate, dashboard, guide, payments and guide in "What
  is Rewire") and these areas:
  - `en-conversation.ts` — the conversation with Rex about a job;
  - `en-courses.ts`, `en-course-sources.ts` — the course catalogue, the cart, the enrolment and
    where the catalogue comes from;
  - `en-offers.ts` — the seller's discount in the catalogue, the cart and the dashboard;
  - `en-learn-listed.ts` — a listed course the learner bought, taken at its provider;
  - `en-marketplace.ts`, `en-wallet.ts` — the roadmap's panels and the wallet;
  - `en-business.ts` — the seller workspace: catalogue, terms, publishing, beacons and sales;
  - `en-pages.ts` — "What is AI" and "What is Rewire";
  - `en-library.ts` — the library of public readings about AI and work.
- `es.ts` and an `es-*.ts` for each `en-*.ts` above — the Spanish catalogue. Each part is typed
  after its English one, so a missing or extra key fails to compile; `tests/catalogues.test.ts`
  also checks that placeholders match.
- `problems.ts` — the problems of the API said by their stable `code`; the server's `detail` is
  only the fallback for a code the interface does not know.
- `format.ts` — numbers, scores, money, dates and lists with `Intl` in the language.
- `use-messages.ts` — the hook that returns `t(key, values)` and the formatters for the current
  language.

Placeholders are written `{name}`. Official titles and tasks are shown as their source publishes
them, in English.
