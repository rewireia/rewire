# @rewire/engine

From what a person writes as their job to what the ILO index says about it. The engine works on a
`DataBundle` already in memory and returns plain data: it never reads the disk or the network,
and every function gives the same result for the same input.

```text
engine/
├── src/            the method, in four layers: text, occupation, exposure and labour
├── tests/          unit tests on hand-written data and end-to-end cases on the shipped bundle
├── dist/           compiled output of `tsc -b`; not committed
├── package.json    the package and its single entry
└── tsconfig.json   build settings for `src/`
```

## The method

1. **Search, weighted by rarity.** Titles and queries are folded (lower case, no accents,
   `ß` → `ss`), split into words and cleared of stop words, and each word goes through
   `singular`: a small rule written for English that drops a plural ending. It is enough because
   queries and titles pass through the same function, and official titles are in the singular.
   Each word weighs `ln(1 + titles / titles containing it)`, so "payroll" counts for more than
   "clerk". A title scores twice the weight it shares with the query over the weight of both: 1
   when they say the same, 0 when they share nothing. The person may not have finished typing
   the last word, so it also matches the words it begins, at 0.8: the 50 that appear in most
   titles, ties broken by alphabetical order. A qualifier ("Developer" in photographic
   processing) counts against the match at half weight unless the person mentions it. Results
   under 0.3 are dropped; one result is kept per occupation and unit group.
2. **The bridge to ISCO-08.** If the source codes the matched title itself (the UK coding
   index), that unit group wins. Otherwise the occupation's first link is proposed and the
   others are kept as alternatives. Links are ordered by the data pipeline; an occupation without
   any link is reported as unbridged, never guessed.
3. **The ILO's bands.** A task score falls in a band: very low below 0.25, low from 0.25,
   medium from 0.50, high from 0.75. The unit group's gradient is copied from the ILO, never
   recomputed. Each task also has a range: the lowest and the highest of the two model
   predictions and the published score; it shows how much the models disagreed and is not a
   confidence interval.
4. **Personal exposure.** The person says how much of the week each task takes: most, some,
   little or none, weighted 3, 2, 1 and 0. An unanswered task counts as "some", so with no
   answers the result is the plain mean of the task scores. The week is split into 100 points per
   band in steps of 5 by the largest-remainder method, so the points always add up to 100.
5. **Standing.** How many scored unit groups have a higher mean score: a count, with no category
   of Rewire's own added to the one the ILO publishes.
6. **Labour context.** Employment and pay come from the region's official statistics, at the
   finest level each publishes: the SOC occupation in the US (the first seven characters of the
   O\*NET-SOC code), the SOC 2020 unit group in the UK, and in the EU the ISCO-08 sub-major group
   (employment) or major group (pay) of the occupation's unit group. Each figure carries its
   level, period, population and source; one the source does not publish is absent, never zero
   or estimated.

## Rules

- Pure functions only: no I/O, no clock, no randomness, no global state. `createEngine` may
  memoise, but nothing it caches changes a result.
- Data comes only from the types and functions `@rewire/data` exports.
- Every threshold is a named constant next to the rule that uses it, never a bare number.
