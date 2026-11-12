# The course catalogue

The marketplace sells two kinds of course, all paid in the PayPal sandbox:

- **Hosted** courses are the demonstration courses Rewire wrote, with lessons, a quiz and a
  certificate inside Rewire.
- **Listed** courses are real courses run by their providers. Rewire links to each one on its
  provider's site and copies none of its syllabus, lessons or logos. Buying one in the sandbox
  enrols the learner in Rewire only: the course itself is taken at the provider, and Rewire issues
  no quiz or certificate for it. No real money moves and no provider is paid.

## Where the listed courses come from

| Source                                                       | Courses                                                                                                                    | Read                                                              | Regions                         |
| ------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- | ------------------------------- |
| Courses chosen by hand (`packages/content/.../curated.json`) | Real courses of several providers, each checked on its provider's page, described in English and Spanish                   | the day in each course's `checkedOn`                              | all, or the one a course is for |
| Microsoft Learn public catalogue API                         | Learning paths and courses, free on the provider's site                                                                    | captured once with `tools/capture-microsoft-learn.ts`             | all                             |
| SEPE, Catálogo de Especialidades Formativas                  | Official Spanish training specialties that can be taken online, with an official level and stated hours, of three families | the official export of 27/09/2026, through `tools/import-sepe.ts` | EU only                         |

Every card carries its provider and the day its data was read; the catalogue answer also lists
each source with the citation it asks for. The SEPE data is cited as «Origen de los datos: SEPE,
Catálogo de Especialidades Formativas (exportado el 27/09/2026)»; it is reused under Law 37/2007
and Royal Decree 1495/2011, and its use here implies no endorsement by the SEPE.

What is not published is not filled in: a course whose provider states no duration has no hours,
a level the SEPE leaves unspecified keeps the specialty out, and the summary of a SEPE specialty
says only what its record says (family, way of taking it and official level). The official levels
1 to 5 are shown as introductory (1), intermediate (2 and 3) and advanced (4 and 5).

## Subjects

Fifteen stable subjects, with labels in English and Spanish, live in
`packages/content/src/courses/topics.ts`. Microsoft Learn courses get theirs from deterministic rules
on the words of the title, the products and the roles the catalogue gives; SEPE specialties from the
words of the official name and their family; the curated and hosted courses carry their own.

## Price

A listed course is not sold by Rewire in reality: its price is a sandbox price of this
marketplace, like the price of a demonstration course. It follows the hours the provider states,
the same number of minor units in every currency, never converted:

| Stated hours     | Price |
| ---------------- | ----- |
| up to 2          | 9.00  |
| over 2, up to 8  | 19.00 |
| over 8, up to 24 | 29.00 |
| over 24          | 39.00 |
| not stated       | 19.00 |

The business can change the price, the minimum it accepts or whether a course is published from
its panel; every answer of the API carries the price the server sets.

## In the learning plan

The three-course plan of an occupation (one course to understand, one to apply, one to
strengthen) chooses among the hosted courses written for its major group and up to 30 listed
courses that the course search finds for the occupation's title and its most exposed tasks. Only
listed courses that state their hours are offered there, since only those can be checked against
the learner's weekly time; courses in the learner's language come first. A listed course takes the
stage of its level (`stageOfLevel`): introductory to understand, intermediate to apply, advanced
to strengthen. Where no listed course fits a stage, a hosted one covers it.

There is one demonstration seller, and every published course is sold at its fixed sandbox price,
the one the seller publishes.

## The API

- `GET /api/regions/:region/courses?language=en|es` returns every published course of the region
  as a card, with the subjects, the providers and the sources to filter and cite them, and the
  standing of the learner of the session (`none` without one). Rewire's own texts and the subject
  labels follow the language asked for; provider titles stay as the provider writes them, and a
  summary is in Spanish when one was written in Spanish. Courses offered in the language asked for
  come first. The answer carries an `ETag`, so a browser asks again only whether it changed.
- `POST /api/courses/search` takes what a person writes. The server first finds up to 24
  candidates in its own catalogue: the words of the request, without words that carry no subject,
  are matched on titles first, then on subjects and providers, then on summaries; a short bridge of
  Spanish words lets a request in Spanish find courses written in English. When a model is
  configured, it may only choose up to five of those candidates and give one sentence for each;
  the server drops any id that was not a candidate and any reason with a figure, a price, a
  certificate, a promise about a job or a prediction of job loss. Without a model, or when its
  answer does not hold, the server's own order stands, with `engine: "rules"`. The request is
  neither stored nor logged.
- `GET /api/learning/listed-courses/:courseId` returns a listed course the learner bought, with the
  link to take it at its provider.
