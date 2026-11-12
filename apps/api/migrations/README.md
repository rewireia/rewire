# migrations

The database schema, as SQL files applied in name order at start-up by `src/platform/database.ts`.

```text
0001_initial.sql          learners, orders and their ledger, enrolments, lesson progress,
                          certificates, sponsorships and webhook deliveries
0002_study_plans.sql      the pace each learner sets for their learning plan
0003_purchase_holds.sql   the one order that may be paid per learner and course; sponsorships
                          written before PayPal is called, with the states of an invoice in flight
0004_capture_and_refund_facts.sql
                          what PayPal captured and whether it matched, the refund asked of PayPal,
                          held captures given their id, two more kinds of ledger row
0005_review_and_refund_cycle.sql
                          payments in review with what PayPal sent, refund attempts, requests in
                          review, four more kinds of ledger row
0006_marketplace.sql      the provider's terms, the spending limit 0010 drops, and the quotes of the
                          agents' negotiation, which 0011 drops
0007_demo_identity.sql    the learner adopted by the shared public demo
0008_course_baskets.sql   the lines of an order of several courses
0009_learning_roadmap.sql the courses a learner chose, apart from access
0010_wallet.sql           top-ups with PayPal, orders paid from the wallet (`wallet` method and a
                          `wallet-paid` ledger row); `orders` rebuilt with every foreign key kept
0011_retire_quotes.sql    the quotes of the retired negotiation; prices are fixed
0012_seller_courses_and_beacons.sql the courses the seller publishes from its dashboard, and its
                          discount beacons on a region
```

## Rules

- Never edit a migration once applied: the server refuses to start when its checksum changes.
  Add the next number instead.
- Each file runs in one transaction. Tables are `STRICT`.
- To widen a check on a table others refer to, as 0010 does with `orders`: defer foreign keys
  (`PRAGMA defer_foreign_keys = ON`), copy the rows aside, drop and recreate the table under its own
  name, and insert the rows back. Renaming it would rewrite the references of the other tables.
