# engine/src/exposure

What the ILO index says about a unit group, and what it means for one person.

```text
exposure/
├── bands.ts       the ILO's four task bands and their thresholds
├── profile.ts     a unit group's tasks, most exposed first, with ranges and band counts
├── standing.ts    where a mean score stands among every scored unit group
├── personal.ts    the time-weighted exposure of the tasks a person really does
└── apportion.ts   largest-remainder split of a total in whole steps
```

## Rules

- Figures are copied from the ILO or derived from them by the rules written here; nothing is
  estimated.
