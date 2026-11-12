# 0002. One shape for three classifications

## Situation

The EU, the US and the UK classify occupations differently, and each reaches ISCO-08 in its own way: by
construction of the code (ESCO), through a crosswalk with typed relations (O\*NET), or title by title
(the ONS coding index).

## Decision

Each pipeline step produces the same `RegionalClassification`: occupations with their official title,
their other titles, and an ordered list of links to ISCO-08, each with the basis for the link. A job title
may carry its own ISCO-08 code, which then wins over its occupation's.

## Consequences

- The engine has one search and one bridge, and treats the three classifications alike. The one
  exception is a key rule for labour figures: the US statistics are published for the SOC occupation,
  not for its O\*NET subdivision, so an O\*NET-SOC code is looked up by its first seven characters
  (`packages/engine/src/labour/figure.ts`).
- Adding a region is a new pipeline step, not a change to the engine.
- The differences that matter to a person, such as why a group was chosen, survive as data (`basis`) and
  are explained in the interface.
