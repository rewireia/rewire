# content/src/courses/listed

Real courses of other providers that the marketplace lists. Rewire links to each one and copies
none of its syllabus, lessons or logos; see `docs/course-catalogue.md`.

```text
listed/
├── index.ts               loads and validates the files below: LISTED_COURSES and LISTED_SOURCES
├── curated.json           courses chosen by hand, each checked on its provider's page, in English and Spanish
├── microsoft-learn.json   snapshot of the Microsoft Learn public catalogue, from tools/capture-microsoft-learn.ts
└── sepe.json              snapshot of the SEPE catalogue of training specialties, from tools/import-sepe.ts
```

## Rules

- The snapshots are written by their tools, never by hand; a curated course is added by hand
  only after its page was read, with the day in `checkedOn`.
- Nothing the provider does not publish is filled in: hours, level and price on the provider
  stay `null` or `unknown` when they are not stated.
