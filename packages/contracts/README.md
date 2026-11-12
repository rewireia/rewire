# @rewire/contracts

The language the API and the web speak to each other: one Zod schema, and the type inferred from it, for
every request and every answer. The API validates what it receives with them and the web validates what it
gets back, so a change of shape is caught by the compiler on both sides.

```text
contracts/
├── src/            one file per area of the API, and the entry; see its README
├── tests/          the rules the schemas enforce
├── dist/           compiled output of `tsc -b`; not committed
├── package.json    the package and its single entry
└── tsconfig.json   build settings for `src/`
```

## Rules

- This package depends on nothing but Zod, and nothing of the server or the engine leaks into it: the web
  bundle carries it whole.
- A schema is the single definition of a shape. Types are inferred from schemas, never written twice.
- `src/index.ts` re-exports each file whole, because this package holds nothing but contracts: every
  schema and type in it is public. The other packages export by name, to keep their internals out.
- Amounts of money are whole minor units with their currency. No field carries a decimal amount.
- Words meant for a person are not sent by the API when the web can say them in the person's language: the
  API sends a stable code (see `paymentIssueSchema`) and the web has the sentence.
