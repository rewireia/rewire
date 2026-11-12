# Marketplace

The demonstration seller publishes one fixed sandbox price per course and region. Rex proposes
courses within the learner's wallet balance (`modules/wallet`); the learner approves and pays from
the wallet or with PayPal. Sales read the payment ledger, including refunds.

- `service.ts`: the marketplace as the routes use it, every price at the clock's time, and the balance as it reads it.
- `catalogue.ts`: the one place a price is decided. Every course of a region (hosted, listed and those the seller published from its dashboard, `modules/seller-courses`) with the one sandbox price the seller set and whether it is on sale; while a discount beacon runs (`modules/offers`), the discounted price everyone pays, with the list price beside it. The table's former minimum column takes the price.
- `training.ts`, `recommendations.ts`: the three-course plan. The candidates are the hosted courses of the occupation's major group and up to 30 listed courses found with the course search on the occupation's title and its most exposed tasks, published, not owned and with stated hours; a listed course's stage follows its level. Each says whether the wallet covers its price.
- `sales.ts`: the seller's sales from the order ledger, without personal data: one per course of each order (basket lines from `order_items`), its method, PayPal reference and share of partial refunds, and totals by currency.
- `roadmap.ts`: the courses a learner chose, apart from access.
- `routes.ts`: role-checked API; `GET /marketplace/wallet` reads held top-ups at PayPal first; `/business/catalogue` and `/business/sales` for the business role, where the terms of a course the seller published are kept with that course.
