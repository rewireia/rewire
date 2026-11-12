# modules

One folder per feature. Each exports a function that returns its Hono routes, mounted under
`/api` by `container.ts`.

```text
health/        liveness
regions/       the regions served and what changes with each
insights/      the data story of a region: the ILO index read through its labour statistics
occupations/   from a job title to an occupation of the region
exposure/      what the ILO index says about an occupation and its tasks
sources/       the official sources behind every figure
learners/      sessions without accounts, and the occupation a learner confirmed
pathway/       the learning plan of an occupation in a region, and a hosted course by its id
courses/       the course catalogue of a region, its sources, and the search of it in a person's words
study-plan/    the learning plan in time, at the pace each learner sets
checkout/      buying a course with PayPal: orders, ledger, refunds and webhooks
wallet/        the learner's wallet: top-ups with PayPal, courses paid from the balance, movements
marketplace/   the seller's fixed prices, the roadmap, Rex's three courses and the seller's sales
seller-courses/  the courses the demonstration seller publishes from its dashboard
offers/        the seller's discount beacons over a region's published courses
learning/      studying a course: lessons, quiz, certificate and its public check
guide/         the AI guide: understands a job, explains a report, prepares a purchase
library/       the readings of the library, in each language
analyst/       one turn of the analyst of "Analyse", carried from AG Studio to the model
sponsorship/   an employer pays for a course through a PayPal invoice
```

## Rules

- A module reaches another only through its exported types and functions; stores are shared
  through `container.ts`, never created twice.
- A module's routes do HTTP only: they parse the input, call a service and shape the answer.
