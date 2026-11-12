# engine/src/labour

How many people work in an occupation and what they earn, from the labour context of its region
in the bundle.

```text
labour/
├── figure.ts    labourFigureFor: the figure of one series for an occupation, at the series level
└── context.ts   occupationLabourOf: employment and pay together, with what each figure counts
```

## Rules

- A series is published at one level, and the occupation is looked up at that level:

| Level                 | Key                                                             | Example                  |
| --------------------- | --------------------------------------------------------------- | ------------------------ |
| `regional-occupation` | the occupation code; for O\*NET-SOC, its first seven characters | `43-3051.00` → `43-3051` |
| `isco-2-digit`        | the first two digits of the ISCO-08 unit group                  | `2512` → `25`            |
| `isco-1-digit`        | the first digit of the ISCO-08 unit group                       | `2512` → `2`             |

- An occupation without a four-digit unit group gets no figure from an ISCO-08 series, and a code
  the series does not publish gives `undefined`: the product then says the figure is not
  published, instead of showing a broader one as if it were the occupation's own.
