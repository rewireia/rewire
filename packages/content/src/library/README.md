# library

The readings of the library: public documents about AI and work that Rewire links to and never
copies. Each one keeps the title its publisher gives it, the publisher, the year, the link, how
long it takes to read and, in Rewire's own words in English and in Spanish, why it may interest
the reader.

```text
library/
├── schema.ts       the Zod schema of a reading, with `why` in both languages
├── readings.json   the readings themselves, in the library's order
└── readings.ts     checks them when the module loads, and joins lists of readings on import
```

## Rules

- A reading is listed only after its link and its title were read at the publisher; `checkedOn`
  is the day of that check.
- Every link is `https`, every id is used once and every document is listed once, whatever the
  address it was found under (a fragment or a trailing slash does not make it another document).
- `readings.json` is kept in the library's order: notes, then guides, then reports; the newest
  first within a kind; then by title. `parseReadings` returns that order, so a file written by hand
  in another order still reads the same.

## Importing readings

`tools/import-readings.ts` reads one or more JSON files, each a list of candidate readings in this
schema, keeps each document once (the first time it appears) and then, with `selectReadings`,
keeps `--per-kind` readings of each kind (25 by default). Within a kind it takes, one at a time,
the candidate whose scope and then whose topic have been chosen least so far, a tie going to the
library's order, so scopes and topics stay as even as the candidates allow and the same candidates
always give the same library. It writes `readings.json`, formatted as the rest of the repository,
and prints the count by kind and by scope, the duplicates and every reading left out.

```sh
npx tsx --conditions=rewire-source tools/import-readings.ts --per-kind 25 first.json second.json
```
