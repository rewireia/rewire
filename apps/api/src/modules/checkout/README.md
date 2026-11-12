# checkout

Buying a course with PayPal, and the learner's payments, including those made from the wallet
(`modules/wallet`), which share these orders, holds, ledger and refunds.

```text
routes.ts              payment configuration, orders, capture, history, refresh and refund
webhook-routes.ts      PayPal's notifications, signed and handled once per event; one about a wallet
                       top-up is handed to the wallet
webhook-signature.ts   checks a webhook was signed by PayPal for our subscription
checkout-service.ts    the steps of a purchase: open, capture, reconcile, list
refunds.ts             asking for a refund, and reading by its id a refund PayPal left pending
purchase-guards.ts     one attempt to pay per course, and the answer to every other attempt
purchase-holds.ts      the hold that lets a single order of a learner's course be paid
settlement.ts          turns what PayPal reports into a change of the order
refund-policy.ts       the money-back guarantee: 14 days, course not completed; each refund's key
order-store.ts         orders: open, find, list, and record each fact in one transaction
order-row.ts           an order as the database holds it, read with a schema
order-description.ts   what the buyer reads at PayPal: the seller (Sun School) and the course or count
order-ledger.ts        the writes of each payment fact: order, ledger row, hold and enrolment together
refund-ledger.ts       the writes of each refund: requested, declined, partial, completed, and one
                       back to the wallet
ledger-row.ts          a ledger row, written only while the order is in a state the fact may change
gateway.ts             the payments provider as the checkout needs it
paypal-gateway.ts      that provider, implemented with PayPal's server SDK
paypal-error.ts        reads PayPal's error body with a schema: its issue and debug id
gateway-problems.ts    PayPal's refusals as problem answers
money.ts               amounts in minor units, written and read as PayPal does
```

## How the money moves

1. The server prices the course from the catalogue in the region's currency; the browser sends
   only the course and the region.
2. An order is stored with that amount and opened at PayPal under our order id. It holds nothing
   yet: an order opened and abandoned blocks no other.
3. After the buyer approves, the order takes the hold of its course (`purchase_holds`, keyed by
   learner and course), and only then is it captured, with an idempotency key.
4. The captured amount and order id must be exactly those asked for. A capture of anything else
   gives no access: it is kept with what it took, the order stays `pending` and keeps its course,
   and the capture is refunded; the order is `refunded` once PayPal confirms it.
5. Only a capture PayPal reports `DECLINED` or `FAILED` is a refusal. One it reports in a way the
   adapter cannot read (an unknown status, a currency Rewire does not sell in, an amount or a
   refund it cannot read) may have taken money: it is kept in review with its id and what PayPal
   sent, as text, the order stays `pending` with `issue: 'needs-review'`, keeps its course and
   gives no access, and every later reading settles it.
6. Each fact is one transaction that moves the order. Its ledger row, its enrolment and its hold
   are written only when the order moves, so a fact that comes late or again writes nothing.
7. A completed capture enrols the learner in the same transaction; a refund revokes it.

## Access follows payment

- A refunded order revokes its enrolment, whichever way the refund arrives (the checkout, a
  webhook or a reconciliation) and whether the course was in progress or completed. A
  certificate already issued stays valid at `GET /certificates/:id`: it attests what was learnt.
- A refund PayPal leaves `pending` is kept on the order (id, state, time, a `refund-requested`
  row) and the access stays: the answer is the order as it stands (`completed`) with
  `issue: 'held-by-paypal'`, the history says `refund: 'requested'`, and another request is 409
  `refund_in_progress`. A webhook or a refresh reads that refund by its id first: completed, the
  order is refunded; declined or cancelled, it is kept as `refund-failed`, the order is paid again
  and refundable, and the next request goes to PayPal under a new key (`refund-<order>-2`, …). A
  refund PayPal declines at once is kept the same way and answered 502.
- A held capture keeps its id and amount on the order, so a refund PayPal reports before the
  capture was ever seen completed still moves the order from `pending` to `refunded`, with both
  rows in the ledger, and lets the course go. A capture whose first news is that it was refunded
  (its answer lost, the tab closed) is taken onto the order in the same transaction, with the id
  and the amount PayPal reports.
- One order at a time may be paid for a learner's course: the one that holds it. Another order,
  opened in a second tab or before, is refused without asking PayPal, both when it is opened and
  when it is captured: 409 `already_enrolled` once the course is paid, `payment_pending` while
  PayPal holds the money, `invoice_pending` while an invoice is out, `payment_in_progress` while
  another capture is under way. The same rule, and the same hold, govern the employer's invoice.
- A hold is let go in the transaction that fails or refunds its order, or when PayPal answers
  that the capture was not approved. A capture PayPal left unanswered keeps it for ten minutes
  (`ATTEMPT_ANSWERED_WITHIN_MS`); after that the next attempt reads that order at PayPal first,
  records a payment it finds, and takes the course only if nothing was captured.
- An order paid from the wallet (`method: 'wallet'`) is written completed, in one transaction, by
  the wallet module, with the statements of this module (`openingStatements`, `paidStatements`).
  Its refund asks nothing of PayPal: the money goes back to the wallet and the access goes.
- A basket paid with PayPal holds up to ten courses and neither needs nor touches the wallet.
- An order failed or refunded is final: capturing it again answers it as it stands. A learner
  refunded buys again with a new order, which gets its own enrolment.
- An invoice that holds a course and was left unanswered is followed up by the sponsorship
  module; the checkout asks it to through `settleInvoiceAttempt`, a function the container
  passes in.
- A capture `PARTIALLY_REFUNDED` still counts as paid: Rewire refunds only in full, so a partial
  refund comes from the merchant's PayPal account and leaves the course open. Each refund PayPal
  lists done is written once, by its own id, as `refund-partial` with its amount; the refund that
  closes the order gives back only what they left, so the ledger still sums to zero.

The same fact may arrive by three routes: the checkout's capture, a PayPal webhook and a
reconciliation (`POST /payments/:orderId/refresh`), in any order and more than once. All three go
through `settlement.ts`. A refund is known by the capture it gives back, whoever reports it, and
its row is written only by the transaction that moves the order from paid to refunded: a capture
and its refund sum to zero in the ledger however their reports arrive.
