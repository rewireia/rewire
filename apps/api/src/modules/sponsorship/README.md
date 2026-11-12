# sponsorship

"Ask my employer to pay": the learner names their employer, Rewire sends a PayPal invoice for the
course, and the course opens when PayPal says the invoice is paid.

```text
routes.ts                asking for an invoice, the learner's requests, a refresh and a cancellation
sponsorship-service.ts   the rules: price, note, guards, cancelling, refreshing, and what the learner sees
invoice-delivery.ts      creating and sending an invoice step by step, and following it up at PayPal
sponsorship-store.ts     sponsorships and their ledger rows, each change in one transaction
invoicing.ts             invoicing as the sponsorship needs it
paypal-invoicing.ts      that invoicing, with PayPal Invoicing v2
paypal-rest.ts           a small client for PayPal's REST API: token, idempotency keys, errors
```

## Rules

- The server prices the invoice from the catalogue, in the currency of the region. Its note
  quotes the rule of the region and its source.
- The employer's address is handed to PayPal and never stored.
- The request is written before PayPal is called, in the transaction that opens its order and
  takes the hold of its course, as `sending`. Then PayPal numbers, creates the draft (whose id is
  kept at once) and sends it, each write keyed by our order id, which is also the invoice's
  reference. So every invoice that can be paid is tied to its order.
- A step PayPal refuses (a 4xx) marks the request `refused`: its order fails with an
  `invoice-cancelled` ledger row that keeps PayPal's code, the course is free again, and the
  answer is the 502. A refused request is not listed.
- A step PayPal leaves unanswered (no answer, a 5xx, an answer it cannot read) marks it
  `unconfirmed`, and the answer is the 502. It keeps the course and is shown as `sent`, without a
  page to pay on. A refresh, a cancellation, a webhook (by invoice id or by reference) and the next
  attempt to pay for the course follow it up: the invoice is read, or found by its reference, and
  recorded; a draft is sent as asked, or left unsent when the learner cancels. PayPal having no
  trace of it closes the request as refused only ten minutes after it began.
- Only a payment in full, observed at PayPal, opens the course: status `PAID`, the invoice Rewire
  sent for this order, its reference our order id, and `payments.paid_amount` exactly the order's
  amount in its currency. It records the order as paid, its `invoice-paid` ledger row with what
  PayPal reports paid, the enrolment and the sponsorship in one transaction, written only if the
  order was still unpaid. A refresh and a webhook settle it the same way, once.
- Anything else PayPal reports paid (in part, another amount or currency, another invoice or
  reference, `MARKED_AS_PAID` by hand with no payment seen) opens nothing: the order keeps what
  PayPal sent as text and stays `pending`, holding the course, with an `invoice-review` row that
  moves no money; the request is `review`, shown as `sent` with `inReview: true`, cannot be
  withdrawn (409 `invoice_not_open`), and is followed up until PayPal reports it paid in full.
- A cancelled invoice fails its order, frees its course and opens nothing.
- One attempt to pay per course at a time, with the hold of `checkout/purchase-holds.ts`: an
  invoice is refused for a course the learner has (409 `already_enrolled`), whose payment PayPal
  still holds (409 `payment_pending`), whose invoice is still out (409 `invoice_pending`) or that
  a PayPal capture is completing (409 `payment_in_progress`). A PayPal order left unanswered is
  settled by the checkout, through a function the container passes in.
- `POST /sponsorships/:id/cancel` withdraws the learner's own request (404 for anyone else's)
  so they can pay themselves. The invoice is read at PayPal first: one found paid is recorded,
  course included, and the answer is 409 `invoice_not_open`, as for a request already paid or
  cancelled. One still open is cancelled at PayPal, which tells the employer, and then recorded
  as cancelled. If PayPal refuses, the answer is a 502 and the request stays `sent`. A request PayPal
  has not confirmed and cannot find yet is answered 409 `invoice_unconfirmed`.
- Without PayPal credentials the answer is 503 `payments_unavailable`; a refusal of PayPal is a
  502 that names PayPal's own code.
