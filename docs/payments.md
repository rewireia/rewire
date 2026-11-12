# Payments

Rewire sells the paid courses of its demonstration catalogue with PayPal, directly or from a wallet the
learner fills with PayPal. This page says what is used, how money moves and what is guaranteed. Every
payment runs in PayPal Sandbox: no real money moves.

## What is used

| PayPal product                             | Where                                | What for                                                              |
| ------------------------------------------ | ------------------------------------ | --------------------------------------------------------------------- |
| Orders v2, through the official server SDK | `modules/checkout/paypal-gateway.ts` | Opening and capturing the order for a course, or a wallet top-up.     |
| JavaScript SDK v6                          | `apps/web`                           | The PayPal button, pay-later eligibility and the approval window.     |
| Payments v2 refunds                        | `paypal-gateway.ts`                  | The 14-day money-back guarantee.                                      |
| Webhooks                                   | `modules/checkout/webhook-*.ts`      | Settling a payment when the browser is gone.                          |
| Invoicing v2                               | `modules/sponsorship/`               | "Ask my employer to pay": an invoice that opens the course when paid. |

## The path of a payment

```text
browser                     API                                  PayPal
   │  POST /checkout/orders   │                                     │
   │ ───────────────────────► │ price = catalogue[course][currency] │
   │                          │ insert order (created)              │
   │                          │ ─── create order, custom_id ──────► │
   │ ◄─────── orderId ─────── │ ledger: order-opened                │
   │                                                                │
   │ ─────────────── approves in PayPal's window ─────────────────► │
   │                                                                │
   │  POST …/capture          │                                     │
   │ ───────────────────────► │ hold (learner, course) → this order │
   │                          │   held by another? 409, no capture  │
   │                          │ ─── capture ──────────────────────► │
   │                          │ ◄── capture: id, status, amount ─── │
   │                          │ same order? same amount?            │
   │                          │ one transaction:                    │
   │                          │   ledger: capture-completed         │
   │                          │   order → completed                 │
   │ ◄──── completed ──────── │   enrolment → active                │
```

## Guarantees

1. **The server decides the money.** The browser sends a course and a region, never an amount. The price
   is read from the catalogue in the currency of the region.
2. **What was captured is what was asked.** A capture is accepted only if PayPal echoes our order id and
   the exact amount and currency. A capture of anything else enrols nobody and is not dropped: the
   order keeps its capture id and what it took (`capture-mismatched` in the ledger), stays `pending`
   and keeps the hold of its course, and the server refunds that capture under the order's
   idempotency key. Until PayPal accepts that refund, every reading of the order (refresh, webhook,
   a later attempt) asks again; once PayPal reports the capture refunded, the order is `refunded` and
   the course is free. Nothing in this gives access, whatever PayPal reports for that capture later.
3. **Access follows payment.** An enrolment is created in the same database transaction that records the
   completed capture, and never before. A capture PayPal holds as `PENDING` gives no access; its id
   and amount are kept on the order, so its outcome can be recorded even when the steps between are
   never reported.
4. **What cannot be read is not taken as nothing paid.** Only a capture PayPal reports `DECLINED` or
   `FAILED` is a refusal that frees the course. A capture it reports in a way the adapter cannot
   read (an unknown status, no status, a currency Rewire does not sell in, an amount, an id or a
   refund it cannot read) is kept in review: its capture id, if any, and what PayPal sent (status,
   currency and value, as text) are stored on the order with a `capture-review` row that moves no
   money. The order stays `pending` with `issue: 'needs-review'`, keeps the hold, gives no access,
   cannot be refunded from the site and refuses another payment of the course (409
   `payment_pending`). Each later reading settles it: paid, refused or refunded, as PayPal then
   reports it clearly. A paid order is never made unpaid by a reading in review.
5. **One attempt to pay per course.** The table `purchase_holds` has the learner and the course as its
   key, so the database lets a single order hold a course. A PayPal order takes the hold before it is
   captured and an invoice before it is sent; a capture or an invoice is never asked of PayPal without
   it. Any other order of the course, from a second tab or opened earlier, is refused with a 409 that
   says why (`already_enrolled`, `payment_pending`, `invoice_pending`, `payment_in_progress`) and no
   call to PayPal. An order opened and never captured holds nothing. The hold is let go in the
   transaction that fails or refunds its order, so a refunded course can be bought again with a new
   order. A capture or an invoice PayPal left unanswered keeps the hold; ten minutes on, the next
   attempt asks PayPal what became of it, records what it finds, and takes the course only when
   nothing can be paid.
6. **Nothing happens twice, nor late.** Every write to PayPal carries a `PayPal-Request-Id` derived from
   our order id. Every change of an order is one transaction that moves it from the states the fact
   may change (unpaid to paid, paid or held to refunded, unpaid to failed); its ledger row, its
   enrolment and
   its hold are written only when it moves. A fact reported again, or after the order moved on, writes
   nothing: a confirmation that comes after a refund does not reopen the course, and a refund is final
   for its order. A refund is known by the capture it gives back, whoever reports it, so a capture and
   its refund sum to zero in the ledger however and however often they are reported. A held capture
   that PayPal completed and refunded before Rewire heard it complete is recorded, in the
   transaction that refunds it, as `capture-completed` and `refund-completed` for what it took: PayPal
   refunds only a completed capture, so both happened. A capture whose first news is that it was
   refunded (the answer of the capture lost, the tab closed) is taken onto the order in that same
   transaction, with the id and the amount PayPal reports; nothing is written that PayPal did not
   report.
7. **Three ways to learn the same fact.** A payment can be confirmed by the checkout call, by a webhook or
   by a later reconciliation. All three run the same function, which reads the order at PayPal and
   records what it finds. A webhook body is only a hint: it is never trusted as the state.
8. **Webhooks are verified locally.** The signature is checked against the certificate PayPal publishes
   (`transmissionId|time|webhookId|crc32(body)`, SHA-256 with RSA), over the raw bytes received, and the
   certificate is accepted only from PayPal's hosts. Each event id is handled once.
9. **The ledger is append-only.** `payment_events` records every step with a signed amount: positive when
   money comes in, negative when it goes back. An order's history can always be rebuilt from it.

## Regions and currencies

A course has its own price in dollars, pounds and euros; prices are set per region, not converted.
PayPal offers pay-later, and settles without converting currency, only to a merchant based in the buyer's
country. So each region may have its own merchant (`PAYPAL_UK_*`, `PAYPAL_EU_*`), and falls back to the
default one when it has none. The pay-later products and amounts documented for each country are part of
the region profiles in `packages/content`; whether a buyer is actually offered one is PayPal's decision,
asked at checkout through the SDK.

## Refunds

A course can be refunded in full within 14 days of payment, unless it has been completed. The refund is
made at PayPal first; then one transaction records it, marks the order refunded and revokes the
enrolment. A refund made from the merchant's PayPal account is picked up by the next reconciliation.

When PayPal accepts a refund but leaves it `PENDING`, its id, its state and the time are kept on the
order with a `refund-requested` row in the ledger (amount 0). The course stays open, the history shows
`refund: 'requested'` and `refundable: false`, and asking again is a 409 `refund_in_progress`. When
PayPal reports the capture refunded (webhook or refresh), the order becomes `refunded` and the history
shows `refund: 'completed'`. A webhook or a refresh first reads that refund by its id: completed, the
order is refunded; `FAILED` or `CANCELLED`, the request is kept in the ledger as `refund-failed` and
taken off the order, which is paid again, keeps its course and is refundable within the window. A
refund PayPal declines at once is kept the same way and answered 502. Each refund of an order is
asked under its own key (`refund-<order>`, then `refund-<order>-2`, …), counted on the order, so a
new request is never answered with the refund PayPal declined. A capture that did not match its
order is asked again the same way at the next reading.

A refund made in part from the merchant's PayPal account leaves the course open: Rewire refunds only
in full, and the learner keeps what was paid for. Each refund PayPal lists done on the capture is
written once, by its own id, as `refund-partial` with the amount PayPal reports, however often and by
whichever route it is reported. When the capture is later refunded in full, by the merchant or
through the guarantee, the `refund-completed` row gives back what the partial refunds left, so the
ledger of the order sums to zero, and the course closes as with any refund.

## Who sells

Every course is sold by one demonstration seller, Sun School, named by the server
(`DEMO_SELLER` in `packages/content`). The buyer reads it at PayPal ("Sun School — <course>", or
"Sun School — N courses" for a basket) and in the payment history (`seller`). A wallet top-up is
Rewire's own, and reads "Rewire wallet top-up".

## The wallet

The learner adds money with PayPal and pays for courses from the balance (`modules/wallet`, and the
"Wallet" tab of the dashboard). It is sandbox money: a server whose PayPal is live refuses it (409
`sandbox_required`).

```text
browser                        API                                    PayPal
   │  POST /wallet/top-ups        │ 5.00 ≤ amount ≤ 500.00                 │
   │ ───────────────────────────► │ insert top-up (created)                │
   │                              │ ─── create order, custom_id = top-up ─►│
   │ ◄──── topUpId, paypal id ─── │                                        │
   │ ─────────────── approves in PayPal's window ─────────────────────────►│
   │  POST …/top-ups/:id/capture  │ ─── capture ─────────────────────────► │
   │ ───────────────────────────► │ ◄── id, status, amount ─────────────── │
   │                              │ same top-up? same amount? → completed  │
   │ ◄──── completed ──────────── │ the balance counts it                  │
   │  POST /wallet/payments       │ one transaction: balance ≥ total,      │
   │ ───────────────────────────► │   order (wallet, completed), lines,    │
   │ ◄──── completed ──────────── │   holds, wallet-paid row, enrolments   │
```

- **The balance is read, never stored.** It is the top-ups PayPal captured, less the orders paid from
  the wallet and still paid. Each figure comes from those rows.
- **A top-up counts only when PayPal captured exactly it.** Held by PayPal, it waits as `pending` and
  is read again whenever the wallet is read or PayPal sends a webhook about it; declined, it adds
  nothing; of another amount, it adds
  nothing and is refunded under its own key. Capturing twice adds once.
- **Paying from the balance is one transaction.** The server prices the courses at the seller's fixed
  sandbox price, the purchase guards apply as for PayPal, the balance is checked in
  the same write transaction (409 `insufficient_balance`, nothing written), and the order is written
  `completed` with its `wallet-paid` ledger row, the holds and the enrolments. Two payments at once
  cannot spend the same money, and a payment sent twice is refused by the holds.
- **The same guarantee, without PayPal.** An order paid from the wallet is refunded within the same
  14 days, before the course is completed. Nothing is asked of PayPal: one transaction writes
  `refund-completed`, marks the order refunded and revokes the enrolment. The money is back in the
  balance.
- **Paying with PayPal does not need the wallet.** A course or a basket of up to ten courses is paid
  with PayPal whatever the balance, and the balance does not change. Rex proposes courses within the
  balance; the learner approves every payment.

## When the employer pays

The learner names their employer. Rewire takes an invoice number from PayPal, then, in one
transaction, opens the order, takes the hold of the course and writes the request as `sending`. Only
then does it create the invoice as a draft, with a note that quotes the region's rule (for the EU,
Article 4 of the AI Act) and our order id as its reference, keep the draft's id, and send it. The
employer's address goes to PayPal and is not stored.

An invoice opens the course only when PayPal has observed a payment in full: status `PAID`, the
invoice Rewire sent for this order (its id, and our order id as its reference), and a paid amount
(`payments.paid_amount`) exactly the order's amount in its currency. Then the same ledger and
enrolment transaction runs, and its `invoice-paid` row records what PayPal reports paid. Anything
else opens nothing: an invoice paid in part (`PARTIALLY_PAID`), paid for another amount or currency
(an adjusted invoice), with another reference or id, or marked as paid by hand (`MARKED_AS_PAID`,
which carries no payment Rewire can check). What PayPal sent is kept on the order as text, with an
`invoice-review` row that moves no money; the order stays `pending` and holds the course; the request
is `review`, shown as `sent` with `inReview: true`, and cannot be withdrawn. It is followed up like
an open request and opens the course once PayPal reports it paid in full; otherwise it is settled
from the merchant's PayPal account.

Each step is recorded before the next, so every invoice that can be paid is tied to its order:

| What PayPal answered                          | The request                    | Then                                                    |
| --------------------------------------------- | ------------------------------ | ------------------------------------------------------- |
| Draft created and sent                        | `sent`                         | Paid or cancelled at PayPal, by a refresh or a webhook. |
| A refusal (4xx) at the draft or the sending   | `refused`, order failed        | Course free again; `invoice-cancelled` keeps the code.  |
| Nothing, a server error or an unreadable body | `unconfirmed`, shown as `sent` | Followed up, as below.                                  |
| The server stopped mid-way                    | stays `sending`                | Followed up, as below.                                  |

A request not confirmed is followed up by a refresh, a cancellation, a webhook (found by the invoice id
or by its reference) and the next attempt to pay for the course: Rewire reads the invoice, or finds it
by its reference, and records what it is. A draft is sent as asked, or left unsent if the learner
cancels; a sent, paid or cancelled invoice is recorded as such. If PayPal has no trace of the invoice,
the request is closed as refused, but only once ten minutes have passed since it began, so that an
invoice created late is not missed. A draft is never sent twice: the send carries the order's key.

While the invoice is out, the learner cannot also buy the course with PayPal. To pay themselves they
cancel the request (`POST /sponsorships/:id/cancel`). Rewire reads the invoice at PayPal first: if the
employer has just paid it, the payment is recorded and the course opens, because cancelling a paid
invoice would leave the employer without what they paid for. Otherwise the invoice is cancelled at
PayPal, which tells the employer, and the order is marked failed.

Two limits remain. Finding an invoice by its reference relies on PayPal's invoice search; an invoice
the search does not return within ten minutes is taken as never created, which is safe only because
an invoice Rewire could not find was never sent by Rewire either. And an invoice sent by hand from
the merchant's PayPal account, outside Rewire, is not followed.

## Without credentials

A server with no PayPal credentials says so: the catalogue is shown, the payment configuration returns
`available: false`, and the checkout responds with 503. Nothing pretends to be a payment.

## Trying it in the sandbox

1. Create a REST app for a sandbox business account at developer.paypal.com and put its client id and
   secret in `.env`.
2. Buy a course with a sandbox personal account, or add funds in the dashboard's wallet with it and
   pay for a course from the balance.
3. For webhooks, subscribe the app to `PAYMENT.CAPTURE.*` and `INVOICING.INVOICE.*` at a public HTTPS
   address and set `PAYPAL_WEBHOOK_ID`. Without a public address, payments still settle through the
   checkout call and the reconciliation.
4. `npm run e2e:live` does the purchase and the refund for you in a browser, with the sandbox buyer
   named in `.env`, and checks the ledger after each step.
