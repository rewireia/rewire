# courses

`/courses`: the course catalogue of the region, real courses from their providers sold by the
demonstration seller at the sandbox prices of this shop.

- `CoursesPage.tsx` — the page: its header says what is real and what is sandbox; while the
  seller's offer runs, its band (`../offers/OfferBand.tsx`); then Rex and the catalogue.
- `RexFinder.tsx`, `RexFinder.module.css` — Rex reads what the person wants to learn and proposes
  courses of the catalogue. The server finds the candidates; the page writes Rex's sentence from
  its answer (`rex-reply.ts`), shows the model's reason under each card, and asks for others
  leaving out those already proposed. While it looks, a line fills with colour once.
- `CourseBrowser.tsx`, `Courses.module.css` — the whole catalogue, searched and filtered in the
  browser (`course-filter.ts`), drawn 24 at a time.
- `CourseFilters.tsx` — the search field and the pills: language, subject, level, provider,
  duration and, while an offer runs, "On offer".
- `use-offer-filter.ts` — "On offer" lives in the address (`?offer=1`), so the band and the
  dashboard notice open the catalogue on those courses; it applies only while the offer runs.
- `CourseCard.tsx`, `CourseCard.module.css` — one course: its provider, level, hours, languages,
  summary and subjects, its sandbox price (with the offer, when one runs: `../offers/`) and the
  buttons that put it in the cart (`../cart/`). The link to the provider appears after buying,
  on the learner's page of the course.
