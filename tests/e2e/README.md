# e2e

End-to-end tests: the browser goes through the product against a real API.

```text
market-journey.spec.ts  the plan's training: money added to the wallet, three courses found, one
                        paid from the balance and one with PayPal, seen in the dashboard and as
                        the provider's sales
market-responsive.spec.ts  EN/ES, desktop/mobile, light/dark: the plan's training, its checkout with
                        the wallet, the dashboard and the business pages fit without overflow
seller.spec.ts          the seller publishes a course, a learner buys it and gets its address,
                        it is a sale in the panel, and a 25 % beacon lowers its shop price
wallet.spec.ts          money added with PayPal's stand-in shows in the wallet and pays for a
                        course; an amount outside the limits offers no PayPal button
sandbox-buyer.spec.ts   Sandbox instructions, copy fallback and live-environment guard
report-journey.spec.ts  US: search, confirm, report (saved week remains unchanged), plan; the
                        sole read-only AG Grid view and score bar,
                        no download action and week/task distribution; and, in
                        Spanish, the band filter emptying the table with the grid's sentence
learning.spec.ts        buy, three lessons, quiz, certificate, verified with no session
dashboard.spec.ts       the course, the payment and the totals listed, a refund, the visitor's
                        invitation, the quick filter by words and amounts as shown (in Spanish),
                        and the refund dialog opening on "Keep the course"
employer.spec.ts        an invoice the employer pays opens the course; a request cancelled from the
                        dashboard stays cancelled; the keyboard reaches every action of a request,
                        and its buttons wait while a check is on its way
explorer.spec.ts        the table: the text filter changes the announced count; the filter finds
                        the level as written; Enter opens a report
explorer-studio.spec.ts "Analyse", the default on a wide screen: the key figures, a major group
                        filtering them, "Edit layout" and back, a change kept after a reload and
                        undone by "Reset", the switch to the table kept; a phone gets the table
                        and never downloads AG Studio. The analyst (on the scripted model) reads
                        an occupation's tasks and hands a filter to Studio's page agent; the
                        occupation in focus follows a click; the menu of a row drills through and
                        opens the report; undo and redo; the second page. AG Studio's trial
                        notice in the console is expected without a licence key; any other
                        console error fails
guide.spec.ts           a description in plain words finds occupations, "Explain my report" links
                        to the tasks (a reference reaches cited evidence while keeping the grid), and asking
                        to buy brings the purchase card with its price
task-language.spec.ts  EN → ES → EN: translated tasks, unchanged scores and times, cached translations
spanish.spec.ts         the start page in Spanish
menu.spec.ts            the first visit: the opening skipped with a key, the individual and business choices,
                        region before role and welcome before an explicit Start; the menu as a modal dialog that holds
                        the focus and gives it back, closes with Escape and the veil; language and
                        theme in the header, region and theme in the menu, kept after a reload
timeline.spec.ts        the plan in time: the pace moves the end date; a course left out stays out
                        after a reload and "Reset" brings it back; the list moves a course and
                        books days with the keyboard alone; dragging a bar moves it and the next
                        course; the dashboard shows the learner's plan
timeline-payments.spec.ts
                        payments on the plan in time: a course waits for its payment, starts when
                        paid and waits again once refunded; an invoice paid by the employer unlocks
                        it without a reload; Tempo changes the plan behind its panel; "Add to
                        my calendar" downloads the courses
courses.spec.ts         Rex proposes courses in the catalogue, two go to the cart, and one PayPal
                        order enrols in both
offers.spec.ts          a discount beacon of the seller lowers the shop and the cart and is
                        announced in the dashboard; with no beacon the shop shows no offer
access.spec.ts          demo sign-in returns to the plan and sign-out locks the dashboard; the
                        business role has its own access and sets the sandbox price of a course
shared-demo.spec.ts     two browsers see the shared learner, and the seller sees the same sale
rex-conversation.spec.ts  a description gives official candidates on the first Enter; a baker is
                        found in both languages; Enter, Shift+Enter and IME Enter; a greeting
                        stays out of the next search
rex-typing.spec.ts      three still dots while a reply is pending with reduced motion
rex-responsive.spec.ts  Rex's composer stays visible on each width and theme
role-navigation.spec.ts the menu destinations, profile persistence, the matching private dashboard,
                        and reopening sign-in from the header
playwright.config.ts    the servers and the browser of these tests
support/                the API they run against, with PayPal, invoicing and the model faked
live/                   one purchase in PayPal's real sandbox, apart from the rest
tsconfig.json           type checking of these files
```

Run them from the repository root with `npm run e2e`
(`node_modules/.bin/playwright test --config tests/e2e/playwright.config.ts`). The configuration
starts the test API on port 8290 and the web on 5290, or reuses them outside CI. Purchases are made
with `page.request`, which shares the page's session, and PayPal's script is refused, so nothing
leaves the machine. `live/` is left out of this run.

## In PayPal's sandbox

`npm run e2e:live` (`node_modules/.bin/playwright test --config tests/e2e/live/playwright.config.ts`)
starts the real API on port 8295, over a database in a new temporary folder, and the web on 5295.
A sandbox buyer opens `/us/courses/ai-foundations`, presses PayPal's button, signs in and approves
in PayPal's window; the web must reach `/learn/ai-foundations`, `GET /api/payments` must hold a
`completed` payment with PayPal's reference, and a refund must leave it `refunded` and the course
closed. It proves that the SDK v6 buttons, the server's order and capture, the ledger and the
refund work with PayPal itself, not with a fake.

The credentials and the buyer are read from `.env` at the root: `PAYPAL_CLIENT_ID`,
`PAYPAL_CLIENT_SECRET`, `PAYPAL_SANDBOX_BUYER_EMAIL` and `PAYPAL_SANDBOX_BUYER_PASSWORD`. Without
any of them the test is skipped and names what is missing. The sandbox sometimes answers with a
passing error page, so the test is tried once more, with waits of up to 90 seconds. No trace,
screenshot or video is kept.

## Rules

- The API under test is `support/test-server.ts`: the real application over a throw-away
  database. Only what would leave the machine is faked: PayPal, PayPal invoicing and the
  language model. No key and no network are needed.
- What only a test may do, such as paying an employer's invoice, is a `/test/` route of that
  server. The product has no such route and simulates nothing: without credentials it sells
  nothing and turns the guide off.
- The answers of the guide are deterministic, so a test can rely on them.

`role-navigation.spec.ts` checks the eight menu destinations, profile persistence, the matching
private dashboard, and reopening the sign-in dialog from the header.
