# data/pipeline/steps

One pure function per source: it validates the records it receives with a schema and returns one
part of the bundle.

```text
steps/
├── ilo-exposure.ts          ILO workbook → exposure dataset and task rationales
├── esco-classification.ts   ESCO API pages → EU classification and URI → ISCO-08 map
├── onet-classification.ts   O*NET and the ESCO–O*NET crosswalk → US classification
├── ons-classification.ts    ONS coding index → UK classification
├── bls-oews.ts              BLS OEWS workbook → US employment and median annual wage
├── ons-aps-employment.ts    Nomis response for the Annual Population Survey → UK employment
├── ons-ashe-earnings.ts     ASHE table 14 → UK median annual pay
├── eurostat-labour.ts       Eurostat responses → EU employment and mean monthly pay
├── labour-figures.ts        figures in code order, and the minimum size of an API response
├── titles.ts                whitespace collapsing and title de-duplication shared by the steps
├── code-cell.ts             a four-digit code cell, text or number, with its leading zeros
└── compare-codes.ts         code order by code units, the same on every machine
```

## Rules

- Steps never touch the network or the disk.
- Labour steps keep only figures the source publishes. A cell marked as withheld, unreliable or
  above a top code (`*`, `#`, `x`, `..`, a Nomis status other than `A`, a Eurostat flag `u`) is
  left out, never written as zero, and nothing is estimated in its place.
- `compare-codes.ts` has a twin in `packages/engine/src/text/`, because the engine imports nothing
  from the pipeline; change both together.
- Every row of the ILO workbook repeats the figures of its unit group; a step refuses rows of one
  unit group that disagree.
