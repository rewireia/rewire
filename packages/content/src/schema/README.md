# content/src/schema

The contract of the content. Every object in `regions/` and `courses/` is checked against these
schemas by the tests.

```text
schema/
├── money.ts            currencies and amounts in minor units, so sums and comparisons are exact
├── course.ts           learning stages, lesson blocks, quiz questions, demo and free courses
├── listed-course.ts    listed and curated courses, and the snapshot of a provider catalogue
└── region-profile.ts   region profiles, their quoted sources and their pay-later offers
```
