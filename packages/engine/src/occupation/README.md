# engine/src/occupation

From free text to a regional occupation and its ISCO-08 unit group.

```text
occupation/
├── title-index.ts   every title of a region with its words, postings, rarities and vocabulary
├── search.ts        rarity-weighted matching, prefix completion and ranking
└── unit-group.ts    the unit group proposed for a matched title, and its alternatives
```

## Rules

- The order of results is a contract: score, then closeness to the official title, then
  preferred language, then shorter title, then code. Among equal titles of one occupation and
  unit group, the one shown is the official title, then one in a preferred language, then the
  shorter one. Change either only with a test that shows why.
