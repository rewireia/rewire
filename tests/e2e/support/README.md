# support

The API the end-to-end tests run against. It is for tests only: the product never simulates a
payment, an invoice or the guide.

```text
sign-in.ts       authenticates a browser session with the public demo credentials
wallet.ts        adds money to the wallet through the test server's fake PayPal
offers.ts        starts a discount beacon of the demo seller through the business API
training.ts      answers the plan's questions, asks Rex for three courses and opens their checkout
test.ts          creates a fresh isolated test database before each Playwright test
work-journey.ts  follows the description, occupation and selected-task journey
test-server.ts   the real API over a throw-away database, with PayPal, invoicing and the model faked
demo-model.ts    a deterministic stand-in for the language model, built on the scripted model
demo-studio-model.ts  a deterministic stand-in for the model behind the analyst of "Analyse"
```

## The test server

```sh
PORT=8290 PUBLIC_ORIGIN=http://127.0.0.1:5290 tsx --conditions=rewire-source tests/e2e/support/test-server.ts
```

- Before each test the `test.ts` fixture asks this server to create a new temporary database and
  new fake providers. All browsers within that test still share the same Demo learner.
- **PayPal** is the in-memory gateway of the API tests (`apps/api/tests/support/fake-gateway.ts`):
  every order the browser approves is captured as completed.
- **Invoicing** is the in-memory invoicing of the API tests. An invoice stays `sent` until the test
  pays it with `POST /test/invoices/:invoiceId/pay` (204, or 404 for an unknown invoice). The id
  is the fragment at the end of the sponsorship's `payUrl`
  (`https://www.sandbox.paypal.com/invoice/p/#INV2-TEST-0001`). The page then sees the payment
  through `POST /api/sponsorships/:id/refresh`, as it would with PayPal. A request can be
  withdrawn with `POST /api/sponsorships/:id/cancel`, which cancels the fake invoice.
- **The guide** answers with `demo-model.ts`, so `GET /api/guide/status` says `available: true`.
- **The analyst** of "Analyse" answers `POST /api/studio/turn` with `demo-studio-model.ts`: a
  question naming 4132 is answered from the occupation's tasks, read with the analyst's own tool;
  one about clerical work is handed to Studio's page agent, which filters the page to the major
  group 4.
- `/test/` routes exist only in this server, never in `apps/api/src`.

## The demonstration model

It drives the real tools of the guide, with fixed sentences in English or Spanish, as its
instructions ask:

- **Interpreting** searches with the first meaningful words of the description, then with each of
  them alone, and proposes the first result.
- **Explaining** writes two short paragraphs that quote only the scores and the `[T1]`, `[T2]`
  tags it reads from the `Facts:` it receives, so they pass the guide's check.
- **Conversing**: when the last message says "buy" or "comprar" and an occupation is open, it reads
  the plan and prepares the purchase of the first paid course not taken yet; otherwise it reads
  the report and the plan.
