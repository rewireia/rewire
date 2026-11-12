# contracts/tests

The rules the schemas enforce at the boundary: defaults, coercion of query strings and the inputs
they must refuse. The API and the web are tested against these same schemas in their own packages.

```text
tests/
├── contracts.test.ts   defaults, coercion and refused inputs, schema by schema
├── insights.test.ts    the data story of a region: a region without labour figures, refused scores
└── tsconfig.json       type checking for the tests, which the package build leaves out
```
