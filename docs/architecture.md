# Architecture

```text
            ┌──────────────────────────── apps/web ────────────────────────────┐
            │ React. Knows only @rewire/contracts. Validates every response.  │
            └───────────────────────────────┬──────────────────────────────────┘
                                            │ HTTP, JSON
            ┌──────────────────────────── apps/api ────────────────────────────┐
            │ Hono. One module per area: routes → service → store or gateway.  │
            │ Owns the database, the session, PayPal and the AI model.         │
            └───────┬───────────────────┬───────────────────┬──────────────────┘
                    │                   │                   │
        ┌───────────▼────────┐ ┌────────▼─────────┐ ┌───────▼────────────┐
        │ packages/engine    │ │ packages/content │ │ packages/contracts │
        │ Pure functions.    │ │ Region profiles  │ │ Zod schemas of the │
        │ No disk, no        │ │ and the course   │ │ API boundary.      │
        │ network, no clock. │ │ catalogue.       │ │                    │
        └───────────┬────────┘ └────────┬─────────┘ └────────────────────┘
                    │                   │
            ┌───────▼───────────────────▼──────┐
            │ packages/data                    │
            │ Official sources → verified      │
            │ bundle, pinned by digest.        │
            └──────────────────────────────────┘
```

## The parts

| Part                 | Responsibility                                                                                                                                                                              | Depends on      |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------- |
| `packages/data`      | Downloads the official sources, turns them into one common shape and writes a bundle whose every file is pinned by SHA-256. Loads the bundle and proves it is whole.                        | Zod             |
| `packages/engine`    | Search, the bridge to ISCO-08, the exposure profile and a person's week. Functions of their arguments only.                                                                                 | types of `data` |
| `packages/content`   | Region profiles with their quoted sources, the hosted demonstration courses, the listed courses of real providers (hand-picked, Microsoft Learn and SEPE), the demo seller and the library. | `data/schema`   |
| `packages/contracts` | The shape of every request and response.                                                                                                                                                    | Zod             |
| `apps/api`           | HTTP, sessions, persistence, PayPal and the AI guide.                                                                                                                                       | all packages    |
| `apps/web`           | The interface.                                                                                                                                                                              | `contracts`     |

## Rules of dependency

1. **Packages never import apps**, and the web imports only `contracts`.
2. **The engine performs no I/O.** It receives the bundle in memory. That makes it trivially testable and
   lets the same code run in a server, a worker or a browser.
3. **Each package is imported through its entry** (`src/index.ts`), never through an inner file.
   `@rewire/data` has a second one, `@rewire/data/schema`, with the schemas and their types but not
   the loader: `content` imports the region schema from it, so it never pulls in `node:fs`.
4. **Inside the API, a module reaches the outside world through an interface** (`PaymentGateway`,
   `InvoicingGateway`, `GuideModel`), with one adapter for the real service and a fake for tests.
5. **`container.ts` is the only place that builds things.** Everything else receives what it needs.

## A request, end to end

`GET /api/regions/us/occupations?q=payroll clerk`

1. `http/middleware.ts` gives the request an id and reads the session cookie.
2. `modules/occupations/routes.ts` validates the query with the contract's schema.
3. The engine searches the O\*NET titles and resolves each match to its ISCO-08 group.
4. `present.ts` shapes the matches as the contract says, and the response goes out.
5. Any error, anywhere, becomes one `application/problem+json` body with a stable `code`.

## Conventions

- TypeScript in strict mode with `noUncheckedIndexedAccess` and `exactOptionalPropertyTypes`; only
  erasable syntax, so Node runs the sources directly.
- Everything that crosses a boundary is parsed with a schema: requests, rows read from the database,
  PayPal's responses, and the API's responses on the web side.
- Factory functions and interfaces rather than classes; classes only for errors.
- One responsibility per function (60 lines at most) and per file (300 at most), enforced by ESLint.
- Every folder that holds code has a README that explains its tree.
- `npm run verify` is the gate: format, lint, types, tests, build, data integrity, unused code,
  licences, generated documents and the delivery check.
