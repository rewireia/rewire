# data/bundle

The verified data bundle Rewire ships: JSON files written by the pipeline and a manifest that
records the SHA-256 and size of each one and the record of every source. Generated and committed.

```text
bundle/
├── manifest.json              digest and size of each file, and every source record
├── exposure.json              ISCO-08 unit groups with their scored tasks
├── exposure-rationales.json   the model reasoning behind each task score
├── classification.eu.json     ESCO occupations in five languages
├── classification.us.json     O*NET-SOC occupations bridged to ISCO-08
├── classification.uk.json     SOC 2020 unit groups with their coded job titles
├── labour.eu.json             employment and pay by ISCO-08 group, for the EU-27
├── labour.us.json             employment and median annual wage by SOC occupation
└── labour.uk.json             employment and median annual pay by SOC 2020 unit group
```

## Rules

- Never edit these files by hand: a changed byte fails the digest check at start-up.
- Rebuild with `npm run data:build` (or `npm run data:build -- --offline` from the cache), then
  regenerate `docs/data-sources.md` with `npm run docs:sources`.
- Verify with `npm run data:check`, which needs no network and also refuses a JSON file here that
  the manifest does not list.
