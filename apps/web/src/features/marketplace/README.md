# Marketplace

The role-guarded business workspace and the learner panels share server-owned marketplace data.

- `WalletPanel.tsx`, `WalletFigures.tsx`, `WalletTopUp.tsx`, `WalletMovements.tsx`, `Wallet.module.css` — the dashboard's wallet: the balance, which rises once to a new amount (`wallet-motion.ts`; at once with reduced motion), adding funds with PayPal (amounts in a capsule or typed, read by `top-up-amount.ts`) and every movement.
- `PayFromBalance.tsx` — a button that pays for courses from the balance; a balance that does not cover it says so, with the way to add funds.
- `BusinessPage.tsx` — the seller workspace of the one demonstration seller, Sun School, for the business role: a navy header and six sections (summary, my courses, publish a course, sales, refunds, discount beacons).
- `SellerSummary.tsx`, `SalesChart.tsx`, `business-figures.ts` — the seller's figures from the server's totals (net revenue, courses sold, refunds, average sale), the share of the catalogue on sale in a radial gauge, sales by day in stacked AG Charts columns and the best sellers. Without sales it says so and shows no figure.
- `SellerCatalogue.tsx`, `SellerGrid.tsx`, `business-columns.tsx`, `TermsForm.tsx` — every course of the region in a paged AG Grid table (search, provider, language, type, status and «created here» filters); the list price is edited in its cell or in the terms of a course, which also withdraw it from sale; a running beacon shows beside it. Each course keeps the provider that wrote it.
- `SellerCourseForm.tsx`, `SellerCourseFields.tsx`, `seller-course-draft.ts` — the form to publish a course or edit one published here, each field checked as it is typed with the server's own rules.
- `BeaconPanel.tsx`, `beacon-window.ts` — the seller's discount beacons: one to activate and those already set, between two times read from `datetime-local` fields in the browser's time.
- `Business.module.css` — the seller workspace's styles.

The wallet holds money added with PayPal Sandbox. Rex proposes courses within its balance at the seller's fixed prices; the learner approves every payment, from the balance or with PayPal. Ordinary PayPal purchases neither need nor change the balance.
