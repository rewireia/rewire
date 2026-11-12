# @rewire/api

The Rewire API: it finds the occupation behind a job title, explains how exposed its tasks are
to generative AI (ILO index), builds a learning plan, sells the demonstration courses with PayPal,
lets an employer pay for one with a PayPal invoice, and lets the learner study them up to a
certificate anyone can verify. An optional AI guide explains what the engine computed.

```text
src/          the server (see src/README.md)
migrations/   SQL migrations, applied at start-up (see migrations/README.md)
tests/        tests of the whole API, through HTTP (see tests/README.md)
var/          local files kept out of version control: the database and the session secret
```

## Run

```sh
npm run dev      # from the repository root: watches src/, serves on 127.0.0.1:8200
npm run build && npm start
```

## Environment

Read once at start-up by `src/config.ts`; an empty variable counts as not set. Copy
`.env.example` at the repository root to `.env`.

| Variable                                                                | Default                 | Meaning                                                                                                          |
| ----------------------------------------------------------------------- | ----------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `APP_ENV`                                                               | `development`           | `development`, `test` or `production`                                                                            |
| `HOST`, `PORT`                                                          | `127.0.0.1`, `8200`     | where the server listens                                                                                         |
| `LOG_LEVEL`                                                             | `info`                  | lowest level written to the log                                                                                  |
| `DATABASE_URL`                                                          | `file:var/rewire.db`    | libSQL address; a relative file is kept under this folder                                                        |
| `PUBLIC_ORIGIN`                                                         | `http://127.0.0.1:5200` | the only origin allowed to change state                                                                          |
| `WEB_ROOT`                                                              | not set                 | the folder of the built web, to serve it next to the API                                                         |
| `SESSION_SECRET`                                                        | created in `var/`       | signs the session cookie; required in production                                                                 |
| `PAYPAL_ENV`                                                            | `sandbox`               | `live` only with `APP_ENV=production`                                                                            |
| `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, `PAYPAL_WEBHOOK_ID`         | none                    | the default merchant                                                                                             |
| `PAYPAL_SANDBOX_DEMO_BUYER_EMAIL`, `PAYPAL_SANDBOX_DEMO_BUYER_PASSWORD` | none                    | optional fictional buyer shown publicly in sandbox checkout; configure together, email at `personal.example.com` |
| `PAYPAL_UK_*`, `PAYPAL_EU_*`                                            | the default merchant    | a merchant of its own for a region                                                                               |
| `OPENAI_API_KEY`                                                        | none                    | turns the AI guide on                                                                                            |
| `OPENAI_MODEL`                                                          | `gpt-6.1-terra`         | the model the guide uses                                                                                         |
| `OPENAI_REASONING_EFFORT`                                               | `high`                  | how hard an OpenAI model reasons: `low`, `medium` or `high`                                                      |
| `GUIDE_PROVIDER_TRAINS_ON_DATA`                                         | `false`                 | `true` when the provider may learn from what it receives: the guide then says so                                 |
| `GUIDE_DAILY_TOKEN_BUDGET`                                              | `2000000`               | tokens the guide may spend per day, in and out                                                                   |
| `ANALYST_DAILY_TOKEN_BUDGET`                                            | `600000`                | tokens the analyst of the explorer may spend per day, apart from the guide's                                     |

The optional sandbox demo buyer credentials are intentionally returned to every visitor by the
payment configuration endpoint. Use only a fictional PayPal sandbox buyer at
`personal.example.com`; never put a real account or a private test credential there. The two
settings are required together and are rejected when PayPal is configured for live payments.
They are independent of `PAYPAL_SANDBOX_BUYER_EMAIL` and `PAYPAL_SANDBOX_BUYER_PASSWORD`, which
are used only by the live test runner.

Without PayPal credentials the catalogue is shown and nothing is sold. Without an OpenAI key
the guide is off and everything else works as usual.

## Architecture

`src/main.ts` reads the configuration and starts the server; `src/container.ts` is the only place
that creates things and wires them together; `src/app.ts` builds the Hono application from the
routes of every module. Each module under `src/modules/` owns its routes, its services and its
tables; stores validate every row they read with Zod and write each change of state in a single
transaction that can be repeated without effect. Errors are thrown as `HttpProblem` and answered
as RFC 9457 problems with a stable `code`.

## Modules and routes

All routes are under `/api`.

| Module        | Routes                                                                                                                                                                                                                              |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `health`      | `GET /health`                                                                                                                                                                                                                       |
| `regions`     | `GET /regions`                                                                                                                                                                                                                      |
| `occupations` | `GET /regions/:region/occupations?q=`, `GET /regions/:region/occupations/:code?isco08=`, `GET /regions/:region/labour?code=&isco08=`                                                                                                |
| `exposure`    | `GET /unit-groups`, `GET /unit-groups/:isco08`, `POST /unit-groups/:isco08/personal-exposure`, `GET /unit-groups/:isco08/tasks/:taskId/rationale`                                                                                   |
| `sources`     | `GET /sources`                                                                                                                                                                                                                      |
| `learners`    | `GET /session`, `PUT /session/profile`                                                                                                                                                                                              |
| `pathway`     | `GET /regions/:region/pathway?isco08=`, `GET /regions/:region/courses`, `GET /regions/:region/courses/:courseId`                                                                                                                    |
| `study-plan`  | `GET /regions/:region/study-plan?isco08=`, `PUT /regions/:region/study-plan?isco08=`                                                                                                                                                |
| `checkout`    | `GET /regions/:region/payment-config`, `POST /checkout/orders`, `POST /checkout/orders/:orderId/capture`, `GET /payments`, `POST /payments/:orderId/refresh`, `POST /payments/:orderId/refund`, `POST /webhooks/paypal`             |
| `learning`    | `GET /learning`, `GET /learning/courses/:courseId`, `POST /learning/courses/:courseId/lessons/:lessonId/complete`, `POST /learning/courses/:courseId/quiz`, `POST /learning/courses/:courseId/certificate`, `GET /certificates/:id` |
| `analyst`     | `POST /studio/turn` — one turn of the analyst of "Analyse": AG Studio's agents run in the browser, the server carries the turn to the model (1 MB body limit, the guide's budget)                                                   |
| `guide`       | `GET /guide/status`, `POST /regions/:region/occupations/interpret`, `POST /unit-groups/:isco08/explanation`, `POST /guide/messages`                                                                                                 |
| `sponsorship` | `POST /sponsorships`, `GET /sponsorships`, `POST /sponsorships/:id/refresh`, `POST /sponsorships/:id/cancel`                                                                                                                        |
