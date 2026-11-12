# data/src/schema

The Zod schemas of every bundle file. Each type is inferred from its schema, never written twice.

```text
schema/
├── index.ts            the `@rewire/data/schema` entry: every schema and type, without the loader
├── isco.ts             the four-digit ISCO-08 unit group code
├── exposure.ts         scored unit groups, tasks, gradients and task rationales of the ILO index
├── classification.ts   regions, regional occupations, job titles and their links to ISCO-08
├── labour.ts           employment and pay by occupation, the level and period of each series
└── manifest.ts         the bundle manifest: files, digests and the record of each source
```

## Rules

- A labour series says what its codes stand for (`level`), the period, the source in the manifest
  and the population the figures count. `byCode` holds only published figures, as whole numbers.
- The exposure dataset names the title of every major group its unit groups belong to.
- Nothing here imports the loader or `node:fs`.
