# api

How the web talks to the Rewire API. It knows only `@rewire/contracts`.

- `request.ts` — one request over `fetch`: every answer is validated with the schema of the
  contracts; errors become an `ApiError` that carries the problem the server described, or one the
  client found (no network, an unreadable answer).
- `client.ts` — the typed client: occupations, exposure, regions, sources and the session, joined
  with the groups below.
- `commerce-api.ts` — plan, a hosted course, PayPal orders, payments and employer invoices, including
  the cancellation of a request still out.
- `learning-api.ts` — enrolments, lessons, quiz and certificates.
- `courses-api.ts` — the course catalogue of a region, the search of Rex and where the listed
  courses come from.
- `guide-api.ts` — the AI guide: status, reading a description, explaining, conversing.
- `study-plan-api.ts` — the learning plan laid out in time, and saving the learner's pace.
- `studio-api.ts` — one turn of the analyst of "Analyse", carried to the model by the server.
- `wallet-api.ts`, `wallet-queries.ts` — the wallet: top-ups with PayPal, payments from the
  balance and movements; the movements live under the wallet's key, so every refresh reloads them.
- `access-api.ts` — signing in to the demonstration account with a role, and signing out.
- `marketplace-api.ts`, `marketplace-queries.ts` — the roadmap and Rex's recommendations, the
  wallet's standing, and the business catalogue, its terms and its sales.
- `seller-api.ts`, `seller-queries.ts` — the seller's own courses and its discount beacons; a
  change reloads everywhere they show.
- `offers-api.ts`, `offers-queries.ts` — the discount a seller runs in a region, as a learner is
  told of it, asked again every few minutes.
- `library-api.ts`, `library-queries.ts` — the readings of the library in one language, read once a
  visit.
- `insights-api.ts`, `insights-queries.ts` — the data story of a region (Explore), read once a visit.
- `instance.ts` — the one client the screens share.
- `queries.ts`, `commerce-queries.ts`, `learning-queries.ts`, `guide-queries.ts`,
  `study-plan-queries.ts`, `courses-queries.ts` — the TanStack Query hooks the screens use, one per route of the API.
  After money moves, every enrolment, payment and plan in time is read again. Saving the plan in
  time keeps the server's answer in the cache. Claiming a certificate reports it from the mutation
  itself, before those reads, so the form may be gone by then.
