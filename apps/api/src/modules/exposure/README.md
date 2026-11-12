# exposure

What the ILO index says about each occupation, and about one person's version of it.

```text
routes.ts       unit groups, the report of one, personal exposure and the reasoning of a task
translation.ts  validates and caches Spanish translations of canonical task text
present.ts      shapes an engine profile as the API answers it
task-focus.ts   the tasks a learner does, and the most and least exposed of them
```

## Rules

- Every figure comes from the engine over the data bundle; nothing is computed here.
- A task marked `none` is left out only when the saved profile is about the same occupation.
