# engine/src

The method as pure functions, in four layers under one facade.

```text
src/
├── index.ts        the public entry; everything else is reached through it
├── engine.ts       createEngine: the facade over one bundle, with per-region indexes
├── text/           folding, stop words and the words of a title
├── occupation/     the title index, the search and the bridge to ISCO-08
├── exposure/       bands, profiles, standing, personal exposure and apportioning
└── labour/         employment and pay of an occupation, from the statistics of its region
```

## Rules

- Layers depend downwards only: `occupation/` uses `text/`, `exposure/` and `labour/` stand on
  their own, and `engine.ts` uses them all.
- Nothing below `engine.ts` keeps state between calls.
