# insights

The data story of a region, for the Explore page: the ILO index read through the region's own
labour statistics. Every aggregate is worked out from the data bundle, once per region, and
carries its source, the edition and the day it was retrieved.

```text
insights/
├── routes.ts      GET /api/regions/:region/insights
├── service.ts     builds and keeps the insights of each region, with the source of each part
├── series.ts      reads a labour series through the scored ISCO-08 unit groups behind each code
└── aggregates.ts  the aggregates: index categories and extremes, major groups, employment by
                   band, and pay against exposure
```

## Rules

- A code of a labour series is read through the scored unit groups behind it: every unit group
  of an ISCO-08 group, or the unit group the classification proposes for a regional occupation
  (for an SOC occupation in the US, the proposed unit group of each O*NET-SOC occupation it
  covers). Several unit groups are averaged. A code that reaches none is left out, and
  `matched` says how much of the series the shares cover.
- The level of each series is kept, so the page can say how fine the figures are: the EU
  publishes employment by sub-major group (two digits) and pay by major group (one digit).
- A part the region's sources do not publish is `null`. Nothing is estimated or extrapolated.
- Exposure is the technical potential of the tasks, not a forecast of job losses.
