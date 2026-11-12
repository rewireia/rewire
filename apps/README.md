# apps

The programs people run. Each one is an npm workspace that depends on `packages/` and is never
imported by them.

```text
apps/
├── api/   HTTP API: occupations, exposure reports, learning plans, payments and courses
└── web/   the web application, which talks to the API only through `/api`
```

## Rules

- An app imports a package only through its public entry, never its files.
- The two apps share nothing but `@rewire/contracts`: the API answers what the contracts
  describe, and the web reads nothing else.
- Each app has its own `README.md`, `tsconfig.json` and `tests/`.
