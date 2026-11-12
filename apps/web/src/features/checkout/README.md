# checkout

Paying with PayPal through the JavaScript SDK v6. The browser never sends an amount: the server
opens the order and captures it.

- `PayPalCheckout.tsx` — PayPal's buttons (and Pay Later when eligible), the order passed to
  `session.start` as a promise of `{ orderId }`, the capture on approval and what the person is
  told after it. `PayPalCheckout` captures the order of a course (the guide uses it with an order
  it already opened); `PayPalPayment` takes its own capture, as the wallet's top-ups do.
- `SandboxBuyer.tsx`, `SandboxBuyer.module.css` — optional server-supplied sandbox buyer instructions, with copy and manual selection. Live checkout never displays them.
- `paypal-sdk.ts` — loads the SDK for the region's merchant and asks which buttons apply. If it
  cannot load, the page says so.
- `capture-outcome.ts` — the outcome of a capture, of a course or a top-up: completed, held,
  failed, mismatch.
- `paypal-elements.d.ts` — JSX types of `<paypal-button>` and `<paypal-pay-later-button>`.
