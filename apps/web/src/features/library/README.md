# library

The page `/library`: public readings about AI and work, from official sources. Rewire links to
each document at its publisher and never copies it.

- `LibraryPage.tsx` — the page: the readings in the person's language, an empty state while none
  is listed, the count shown, the cards and the notice with the day of the latest review.
- `LibraryFilters.tsx` — the kind as a capsule (all, notes, guides, reports), topic and level as
  native lists, and where a reading applies (Global, EU, US, UK) as pills to toggle.
- `ReadingCard.tsx` — one reading: kind and level, title, publisher and year, reading time,
  language and format, why it may interest the reader, and the link, said to open a new tab.
- `duration.ts` — a reading time in minutes below an hour and a half, in whole hours from then on.
- `filters.ts` — the filters as pure functions: the first choice (the person's region with the
  global readings, every other scope one click away), filtering, the topics and levels on offer
  and the day of the latest review.
- `Library.module.css` — the filters, the cards and the empty states.
