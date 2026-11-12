# tests

Tests of the whole API. Most call the real application with `app.request(...)`, over the real
data bundle, a fresh database file per test, a fixed clock and an in-memory PayPal.

```text
config.test.ts            defaults, empty variables, production rules, merchants and the guide
logger.test.ts            minimum level and one JSON object per line
money.test.ts             amounts written and read exactly, and refused when malformed
database.test.ts          migrations in order, once, dated by the clock; foreign keys everywhere
certificate-id.test.ts    format and alphabet of certificate ids
http.test.ts              problem bodies, request id, 404, 413, same-origin, bad JSON, bad region
web-files.test.ts         the built web served next to the API: pages, caching, compression
paypal-gateway.test.ts    captures and refunds read from PayPal, and PayPal's error body
paypal-rest.test.ts       PayPal's REST client: token, idempotency key, errors, network
paypal-invoicing.test.ts  the four calls of an invoice, its states, unreadable answers
occupations.test.ts       search, exposure reports, personal exposure, reasoning and sources
occupation-detail.test.ts one occupation by its code, and its labour market
insights.test.ts          the data story of a region: series read through unit groups, aggregates, route
session.test.ts           visitors, sessions asked for, saved profiles, forged cookies and occupations checked
checkout.test.ts          buying, capturing, pending, mismatch, refunds and the history
purchase-holds.test.ts    one attempt to pay per course: two tabs, old orders, lost captures, invoices
payment-facts.test.ts     late, repeated and crossed reports of a payment and its refund; ledger sums
payment-recovery.test.ts  held captures refunded unseen, refunds left pending, captures of another amount
payment-review.test.ts    captures that cannot be read kept in review; a capture first seen refunded
refund-cycle.test.ts      refunds declined at once or later, new keys, partial refunds from the merchant
sponsorship.test.ts       an employer's invoice: sent, paid, cancelled, guards and privacy
sponsorship-cancel.test.ts withdrawing a request: cancelled at PayPal, found paid, refused
invoice-recovery.test.ts  invoices PayPal did not confirm or refused, followed up and never lost
invoice-review.test.ts    an invoice paid in full opens the course; paid in part, by hand or otherwise, waits
webhook.test.ts           signature checks and how PayPal events settle orders
pathway.test.ts           regions and the learning plan, prices, pay-later and statuses
catalogue.test.ts         the paid courses of a region, with the learner's standing
course-catalogue.test.ts  hosted and listed courses, terms, search with and without a model, listed enrolment
business-seller.test.ts   the demonstration seller: its catalogue and prices in the shop, and a
                          sale per course of each order, by method, with refunds and totals
seller-courses.test.ts    a course the seller publishes: checked, in the shop and search, paid,
                          sold, and its address only for who bought it
discount-beacons.test.ts  a beacon's window on a controlled clock, overlaps, cancelling, and the
                          discounted price in a basket, the wallet and a refund
study-plan.test.ts        the plan in time: order, pace, moved and left-out courses
study-plan-upkeep.test.ts a plan saved long ago against today's catalogue, and progress on it
study-plan-payments.test.ts a paid course waits for its payment: PayPal, a held payment, an invoice, a refund
calendar-day.test.ts      days of the calendar: month ends, leap years and the reader's own day
learning.test.ts          the dashboard, lessons, quiz and certificates, end to end
certificates.test.ts      no free id, and a refund that leaves the certificate verifiable
guide.test.ts             the AI guide, driven by a scripted model: interpreting, explaining, refusals, budget
guide-conversation.test.ts  the guide's conversation: report and plan as cards, a real order, refusals
guide-plan.test.ts        the guide reads the plan in time and changes it as the person asks
figures.test.ts           the figure detector on its corpus, and task tags
guide-checks.test.ts      what the guide may say: words only, numbers in cards, a second try, a refusal
guide-claims.test.ts      forecasts of job loss on their corpus, and the sentences of past reviews
token-budget.test.ts      the daily token budget: a limit per call, at once, settled also on failure
plain-text.test.ts        marks of emphasis removed from what the model says, and nothing else
openai-model.test.ts      an OpenAI model behind the guide: tool rounds, refusals, cut-offs, failures,
                          the limit of a call and what each failure spent
studio-model.test.ts      the analyst's turn at OpenAI: what is sent, calls, JSON, unreadable answers
analyst.test.ts           POST /api/studio/turn: text, calls, body limit, session, purpose, tools, budget, 502
support/                  the harness the tests share (see support/README.md)
corpus/                   sentences the checks of the guide's words are measured on (see corpus/README.md)
```

## Rules

- Every answer is parsed with its schema from `@rewire/contracts`.
- Test names state the rule they protect.
