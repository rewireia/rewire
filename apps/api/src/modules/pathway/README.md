# pathway

The learning plan of an occupation in a region, and the catalogue it draws on.

```text
routes.ts            the plan of an occupation, and the catalogue of paid courses of a region
pathway-service.ts   gathers the learner's enrolments and pending payments for both
pathway.ts           pure rules: steps, prices, pay-later hints and where the learner stands
```

## Rules

- Three steps, `understand`, `apply` and `strengthen`; in each, free courses come first.
- Prices are the catalogue's, in the region's currency. Pay-later hints are those PayPal
  documents for that currency and amount.
- A visitor sees `none` for every course.
