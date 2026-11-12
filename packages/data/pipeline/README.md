# data/pipeline

The program behind `npm run data:build` and `npm run data:check`.

```text
pipeline/
├── build.ts            command line: build, then check and report coverage
├── assemble.ts         downloads every source and runs the steps
├── write-bundle.ts     validates and writes the bundle with its manifest
├── check-bundle.ts     verifies digests, schemas and that the manifest lists every file
├── tsconfig.json       type checking for the pipeline, which the package build leaves out
├── download.ts         cached, pinned downloads of files, pages and API responses
├── sources.ts          every source, pinned, and the three kinds of source
├── labour-sources.ts   the statistics of employment and pay of each region
├── readers/
│   ├── csv.ts          CSV with a byte order mark or notes above the header
│   ├── spreadsheet.ts  one sheet of an .xlsx workbook as records
│   └── json-stat.ts    a JSON-stat dataset read along one dimension
└── steps/
    ├── ilo-exposure.ts         ILO workbook → exposure dataset and rationales
    ├── esco-classification.ts  ESCO API pages → EU classification and URI → ISCO-08 map
    ├── onet-classification.ts  O*NET and the ESCO–O*NET crosswalk → US classification
    ├── ons-classification.ts   ONS coding index → UK classification
    ├── bls-oews.ts             BLS OEWS workbook → US employment and median annual wage
    ├── ons-aps-employment.ts   Nomis response for the Annual Population Survey → UK employment
    ├── ons-ashe-earnings.ts    ASHE table 14 → UK median annual pay
    ├── eurostat-labour.ts      Eurostat responses → EU employment and mean monthly pay
    ├── labour-figures.ts       figures in code order, and the minimum size of an API response
    ├── titles.ts               whitespace collapsing and title de-duplication shared by the steps
    ├── code-cell.ts            a four-digit code cell, text or number, with its leading zeros
    └── compare-codes.ts        code order by code units, the same on every machine
```

## How a build runs

```text
sources → download → read → steps → validate → bundle
```

1. `sources.ts` and `labour-sources.ts` name every source: its identity, licence and where its
   files are, pinned by digest (a paged collection by its expected total, and a statistics API
   query by its fixed period and minimum number of records).
2. `download.ts` fetches what `.cache/` lacks and refuses bytes that do not match the pin.
3. `readers/` turn bytes into records: CSV text, the sheets of an `.xlsx` workbook or a JSON-stat
   dataset.
4. Each file in `steps/` turns the records of one source into one part of the bundle, as a pure
   function that validates its input rows with a schema.
5. `assemble.ts` runs the steps in order; `write-bundle.ts` validates the result against the
   schemas of `src/` and writes the files and the manifest; `check-bundle.ts` proves a written
   bundle is whole.

## Adding a source

1. Declare it in `sources.ts` (or `labour-sources.ts`) with its licence, attribution and pinned
   files, pages or queries, and add it to `SOURCES`.
2. Write a step in `steps/` that validates the rows it reads and returns the common shape, with
   a test in `tests/` built from a few hand-written rows.
3. Call the step from `assemble.ts` and record the digest of the source in `sourceDigests`.
4. If it feeds a new bundle file, add the file to `BUNDLE_FILES` and to `write-bundle.ts`.
5. Rebuild, run `npm run data:check` and regenerate `docs/data-sources.md`.

## Rules

- Steps never touch the network or the disk: they receive records and return data.
- A rule of the bridge to ISCO-08 is written once, in its step, with a comment that says why.
- Console output is allowed here only: these are command-line programs.
