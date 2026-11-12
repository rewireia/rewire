# content/src/regions

One `RegionProfile` per region, gathered in `REGION_PROFILES`.

```text
regions/
├── index.ts               REGION_PROFILES, keyed by region
├── eu.ts                  European Union: EUR, ESCO, DigComp and Article 4(1) of the AI Act
├── us.ts                  United States: USD, O*NET, the DOL AI Literacy Framework, employer aid
├── uk.ts                  United Kingdom: GBP, SOC 2020, the AI Skills for Business framework
└── pay-later-source.ts    the PayPal page the pay-later limits were read from, and the day
```

## Rules

- Each `employerCase.quote` is quoted from the page in `employerCase.source`, with omissions
  marked; the `explanation` is Rewire's own text and says no more than the source does.
- Pay-later limits are read from the Pay Later overview of the PayPal developer documentation.
  Every offer names that page in `source` and the day it was read in `checkedOn`; change a limit
  only after reading the page again, and update `checkedOn` with it.
