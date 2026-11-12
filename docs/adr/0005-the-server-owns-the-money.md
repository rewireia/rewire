# 0005. The server owns the money

## Situation

A checkout is driven by a browser, which cannot be trusted, and confirmed by a network call that can time
out, be retried or be delivered twice.

## Decision

The browser names a course and a region; the server reads the price. A capture is accepted only when
PayPal echoes our order id and the exact amount. The capture, the order's change of state and the
enrolment are written in one database transaction. Every step is also appended to a ledger whose unique
key makes recording the same PayPal fact twice a no-op, and every write to PayPal carries an idempotency
key derived from our order id.

## Consequences

- The checkout call, a webhook and a later reconciliation can all report the same payment, in any order
  and any number of times, and the outcome is the same.
- No course opens for a payment that is pending, mismatched or refunded.
- The history of an order can be rebuilt from the ledger alone.
- See [payments.md](../payments.md).
