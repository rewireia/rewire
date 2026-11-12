# courses

The course catalogue of a region, and the search of it in a person's own words.

```text
routes.ts              GET /regions/:region/courses, GET /courses/sources and POST /courses/search
sources.ts             where the listed courses come from, with counts and citations
catalogue-service.ts   the cards of a region at server prices, the learner's standing, the search
cards.ts               what a card says in each language, worked out once when the server starts;
                       a course the seller published, from its latest version
search-index.ts        the lexical search: words of titles, subjects and summaries, and a Spanish
                       bridge; the seller's own courses are indexed again whenever they change
course-guide.ts        the model chooses among the candidates and says why; the server checks it
```

## Rules

- Prices, ids and candidates come from the server; the model only orders candidates it was given
  and writes one sentence each, which is dropped if it holds a figure, a price, a certificate, a
  promise about a job or a prediction of job loss.
- Without a model, or when its answer does not hold, the lexical order stands (`engine: "rules"`).
- What a person writes is used for one answer only: it is neither stored nor logged.
