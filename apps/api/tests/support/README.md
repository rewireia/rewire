# support

```text
test-api.ts         the API over a temporary database, plus helpers to buy a course
client.ts           a browser that keeps the session cookie, and body checks by schema
fake-gateway.ts     PayPal in memory, told how to answer each capture and refund, or to lose or fail
                    one; refunds by key, declined or partial, and captures it cannot read
fake-invoicing.ts   PayPal invoicing in memory: drafts, invoices sent, paid (in full or not),
                    cancelled; a call refused, unanswered, lost, or cut short by the server stopping
payments.ts         a payment as PayPal reports it, for tests that record one late or again
wallet.ts           adds money to the wallet end to end through the fake PayPal, and reads it
scripted-model.ts   a language model the test writes: it calls the guide's tools and answers
webhooks.ts         signs webhooks as PayPal does, with a key made for the test
study-plan.ts       reads and saves the plan in time of one occupation, and reads its courses
corpus.ts           reads a corpus of `../corpus/` and scores a check on it
```

These doubles are also used by the end-to-end server in `tests/e2e/support/`. They exist for tests
only: the product never simulates a payment or the guide.
