# @rewire/content

The editorial content of Rewire: what changes from one region to another, the free courses the
learning plan links to, and the demonstration catalogue of paid courses. It is plain TypeScript
data checked against Zod schemas, with a few pure functions to read it.

```text
content/
├── src/            the content, its schemas and the functions that read it; see its README
├── tests/          the content against its schemas, and the editorial rules as tests
├── dist/           compiled output of `tsc -b`; not committed
├── package.json    the package and its single entry
└── tsconfig.json   build settings for `src/`
```

## What is editorial content, and what is not

Editorial content is text Rewire writes or chooses by hand and reviews like code:

- **Region profiles** (`src/regions/`): currency, locale, the job classification of the region,
  its public framework of AI skills, the rule that may lead an employer to pay for training,
  and the PayPal pay-later offers of its countries. Every rule is quoted from its official
  source, with omissions marked, and with the link; the explanation never promises more than the
  source says.
- **Free courses** (`src/courses/free.ts`): real courses run by others. Rewire only links to
  them, describes them in its own words and copies no text, syllabus or logo from the provider.
  Rewire has no relationship with the providers it links to and is not paid to link to them.
- **Demo courses** (`src/courses/demo/`): paid courses written by Rewire for the demonstration.
- **Library readings** (`src/library/`): public documents about AI and work that Rewire links to
  and never copies, with why each may interest the reader in English and Spanish.

Data is not editorial content. Occupations, tasks and exposure scores come from official
sources through `@rewire/data`, and the engine computes from them; nothing here holds a score,
an occupation code or a task.

## Listed courses

Besides its demonstration courses, the marketplace lists real courses of other providers
(`src/courses/listed/`): a hand-picked set checked on each provider's page, a snapshot of the
Microsoft Learn public catalogue and, for the EU, the online specialties of the SEPE catalogue of
training specialties. Rewire links to each one and copies none of it; its price here is a sandbox
price by bands of the hours the provider states (`listed-price.ts`), the same number in every
currency. `findSellableCourse(id)` finds any course the marketplace sells, hosted or listed, in
one map lookup. `docs/course-catalogue.md` gives the sources, the subjects and the price bands.

## Free first

A learning plan shows the free courses before any paid one. `freeCoursesFor(region)` gives the
courses open to anyone plus those of the person's region, and the paid catalogue comes after.

## The paid courses are a demonstration

The seven paid courses are a demonstration catalogue, written by Rewire to show the purchase
flow with PayPal in sandbox mode. Every screen that shows one says it is a demo. They are
written to be correct and useful nonetheless: plain English, neutral about products and brands,
and honest about what generative AI does well, where it produces confident errors, and what
stays the responsibility of the person who uses it.

Prices are set per currency in minor units (`prices.USD`, `prices.GBP`, `prices.EUR`) rather
than converted, and the server is the only place that reads them to charge.

## Adding a demo course

1. Create `src/courses/demo/<id>.ts` exporting one object with `satisfies DemoCourse`, where
   `<id>` is the course `id`.
2. Give it a stage, the ISCO-08 major groups it is written for (empty for every job), three
   outcomes, lessons of 120 to 260 words with a key point each, a practice that works on any
   task the person chose, and a quiz whose right answers vary in position and length.
3. Add it to `DEMO_COURSES` in `src/courses/demo/index.ts`, in the order of the learning plan.
4. Run the tests: they check the schema, unique identifiers, lesson length and the quiz.

## Which free courses are listed

A free course is listed only when it is free in full, not a free trial or a free first module;
open to the public, without an employer or a paid account; and about working with AI in general
rather than about operating one company's product.

## Reviewing a free course link

1. Open the URL and confirm that the page loads and that the course exists under that title. The
   link goes to the course's own page or, when the course has none, to the official announcement
   of the organisation that offers it.
2. Confirm on that page, the provider's own, that the course is free.
3. Set `hours` only when the page states a duration; otherwise leave it `null`.
4. Update `checkedOn` to the day of the check. Remove a course whose page no longer says it is
   free, rather than keeping a claim nobody can confirm.

## Rules

- Nothing here holds a score, an occupation code or a task: those come from `@rewire/data`.
- Every claim about a region or a course carries its source and the day it was checked.
- Region types and schemas come from `@rewire/data/schema`, never from the loader.
