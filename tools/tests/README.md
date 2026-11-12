# tools/tests

Unit tests of the pure rules behind the repository tools. Run them with `npx vitest run tools/tests`.

```text
tests/
├── licence-rules.test.ts      SPDX expressions and the permitted licences
├── data-sources-doc.test.ts   the data sources page rendered from a manifest
├── delivery-rules.test.ts     each delivery rule, on files that pass and files that fail
├── microsoft-learn-rules.test.ts the Microsoft Learn snapshot and its subjects, on a fixed sample
└── sepe-rules.test.ts         the SEPE snapshot: kept specialties, names, levels and subjects
```
