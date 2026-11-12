# data/src

What the rest of Rewire imports from `@rewire/data`: the shape of the data and the loader.

```text
src/
├── index.ts      the main entry: the loader, the coverage measure, the schemas and their types
├── bundle.ts     loadDataBundle and loadTaskRationales, with digest verification
├── coverage.ts   how much of each regional classification reaches a scored unit group
└── schema/       the schemas of the bundle files, also the `@rewire/data/schema` entry
```

## Rules

- Schemas are written with Zod and their types are inferred from them, never written twice.
- The loader trusts the schemas the pipeline validated and checks only the digests, so loading
  stays fast. Anything that reads data from elsewhere must parse it with a schema first.
- Files here run in the product: no network, and the disk only through `bundle.ts`.
