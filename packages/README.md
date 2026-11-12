# packages

The libraries the apps are built on. Each one is an npm workspace with its own `package.json`,
`tsconfig.json`, `src/` and `tests/`.

```text
packages/
├── data/        official sources → verified data bundle, and the loader that reads it
├── engine/      from a job title to an exposure report; pure functions over the bundle
├── content/     editorial content: region profiles and the course catalogue
└── contracts/   schemas of the API boundary
```

## Rules

- A package is imported only through its public entries: `src/index.ts`, and for `data` also
  `src/schema/index.ts` (`@rewire/data/schema`). Never reach into another package's files.
- `engine` uses only the types and functions that `@rewire/data` exports, and `content` only
  the schemas and types of `@rewire/data/schema`. It never reads the
  bundle from disk itself: whoever calls it passes a loaded `DataBundle`.
- `data` depends on no other workspace package.
- Nothing under `apps/` is imported from `packages/`. Dependencies point from apps to packages,
  never back.
- Inside the repository, packages resolve to their TypeScript sources through the
  `rewire-source` export condition; `dist/` is what a build publishes.
