# wallet

The learner's wallet: money added with PayPal (sandbox), courses paid from the balance, and
every movement.

```text
routes.ts          top-ups, their capture and refresh, payments from the balance, movements
wallet-service.ts  the wallet as the routes use it; reads held top-ups again before answering
balance.ts         the balance as three sums the database keeps, never a figure stored on its own
top-up-store.ts    top-ups: open, find, list, and each change as one conditional write
top-ups.ts         a top-up end to end: opened at PayPal, captured, read again, given back
payments.ts        paying for courses from the balance, in one transaction
movements.ts       top-ups, payments and refunds, newest first
```

## The balance

`funded` is the sum of top-ups PayPal captured (`completed`). `spent` is the sum of orders paid from
the wallet (`method = 'wallet'`) that are still paid: a refunded one gives its money back.
`available = funded − spent`. Every figure is read from those rows; nothing else is stored.

## Adding money

`POST /wallet/top-ups { region, amountMinor }` checks the amount (5.00 to 500.00 in the region's
currency), stores the top-up as `created` and opens the order at PayPal under the top-up's id, with
the region's merchant. The browser approves it in PayPal's window and calls
`POST /wallet/top-ups/:id/capture`. The guarantees are those of the checkout:

- Only a capture of exactly the amount asked, echoing this top-up's id, is `completed` and counts.
- A capture PayPal holds is `pending` and counts only once PayPal releases it; one PayPal reports in
  a way the adapter cannot read waits the same way (`issue: 'needs-review'`). Every reading of the
  wallet (`GET /marketplace/wallet`, `GET /wallet/movements`) reads them at PayPal again, as does
  `POST /wallet/top-ups/:id/refresh`, and a PayPal webhook about the top-up (found by its id or
  PayPal's order id), which reads it at PayPal the same way.
- A declined capture is `failed`; one not approved stays `created`. Neither counts.
- A capture of another amount is `mismatched`: it never counts and is refunded at PayPal under the
  key `refund-top-up-<id>`; it is `refunded` once PayPal confirms it.
- Capturing again is safe: a settled top-up is answered as it stands, without calling PayPal. Each
  write moves a top-up only from the states the fact may change, so the same fact twice adds once.
- A top-up of another learner is a 404. The wallet works only when PayPal is in sandbox (409
  `sandbox_required` otherwise): it never holds real money.

## Paying from the balance

`POST /wallet/payments { region, courseIds (1–10) }` prices the courses on the server at the
seller's fixed sandbox price, refuses what the purchase guards refuse
(`already_enrolled`, `payment_pending`, …), and in one write transaction checks
`available ≥ total` (409 `insufficient_balance`), stores a `completed` order with method `wallet`,
its lines (`order_items`, for two courses or more), the hold of every course, the `wallet-paid`
ledger row and the enrolments. A payment sent twice finds its courses held
and is refused: nothing is charged twice. The order is then like any other: it shows in
`GET /payments`, in the provider's sales and in the roadmap.

A refund (`POST /payments/:id/refund`, same 14-day guarantee) of an order paid from the wallet asks
nothing of PayPal: one transaction writes `refund-completed` for the whole amount, marks the order
refunded, revokes the enrolment and lets the course go. The money is back in the balance.
