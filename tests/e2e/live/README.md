# live

The isolated real PayPal **sandbox** journey is separate from `npm run e2e`. It creates a fresh
local database and makes three buyer-approved sandbox purchases. The third is refunded; learner
and business histories must show the same real order states. Five published courses are checked,
including at least two without sales. No payments or sales are preseeded.

`paypal-sandbox.spec.ts` uses the SDK's Pay Later button if it is offered, otherwise records that
it was unavailable and uses standard PayPal for the second course. Using that button alone does
not verify that financing was selected: the test reports that distinction explicitly. Login
challenges or CAPTCHA stop the journey; they are not bypassed.

`playwright.config.ts` forces sandbox, starts the real API and web over a throw-away database,
disables retries, traces, screenshots and video, and keeps the buyer's credentials out of output.
The credentials come from the root `.env`: `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`,
`PAYPAL_SANDBOX_BUYER_EMAIL` and `PAYPAL_SANDBOX_BUYER_PASSWORD`. Nothing is run without them.
Because a network failure can occur after PayPal has processed a request, inspect sandbox and
local payment state before manually rerunning any failed journey.

`paypal-refund.spec.ts` is a separate, explicitly enabled journey for one standard PayPal
sandbox purchase and its refund. It checks the completed payment and the refunded state in both
learner and business histories, then checks that course access was revoked. It is useful when the
three-purchase journey cannot reach its refund step. Enable and run only this journey with:

```sh
PAYPAL_SANDBOX_REFUND_LIVE=1 npx playwright test --config tests/e2e/live/playwright.config.ts paypal-refund.spec.ts
```

It uses the same credentials, sandbox-only check, fresh database and no-retry policy as the other
journey. A successful or uncertain attempt must be checked before rerunning it.

`paypal-wallet.spec.ts` is a third, explicitly enabled journey: the sandbox buyer approves a
top-up of the wallet in PayPal's own window, the server captures it, and the balance then pays for
a course in one step. It checks the wallet and the payment history through the API. Run it with:

```sh
PAYPAL_SANDBOX_WALLET_LIVE=1 npx playwright test --config tests/e2e/live/playwright.config.ts paypal-wallet.spec.ts
```
