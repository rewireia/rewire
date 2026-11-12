# tools

Repository tools that keep what Rewire publishes honest.

```text
tools/
├── check-delivery.ts      walks the repository and reports the delivery findings
├── delivery-rules.ts      the delivery rules, as pure functions
├── data-sources.ts        reads the manifest and writes or checks docs/data-sources.md
├── data-sources-doc.ts    renders the data sources page from a manifest
├── licences.ts            reads the installed packages and writes or checks the notices
├── licence-rules.ts       parses SPDX expressions and decides what is permitted
├── capture-microsoft-learn.ts  reads the Microsoft Learn public catalogue into a course snapshot
├── microsoft-learn-rules.ts    the fields of that snapshot, as pure functions
├── microsoft-learn-topics.ts   the subjects of a Microsoft Learn course, by rules
├── import-sepe.ts         turns an export of the SEPE catalogue of specialties into a course snapshot
├── sepe-rules.ts          which specialties are kept, and their names, levels, summaries and subjects
├── import-readings.ts     joins lists of candidate readings, keeps 25 of each kind in balance and writes the library
├── tests/                 unit tests of the pure rules
└── tsconfig.json          type checking for the tools and their tests
```

## Licences

`licences.ts` lists every production dependency from `package-lock.json`, with the licence its installed `package.json`
declares. Each licence must be one of MIT, ISC, Apache-2.0, BSD-2-Clause, BSD-3-Clause, 0BSD, BlueOak-1.0.0, CC0-1.0 or
Unlicense, or an SPDX expression that combines them: with `OR` one permitted side is enough, with `AND` both must be.
The only exceptions are named one by one in `COMMERCIAL_EXCEPTIONS`: the four commercial packages of AG Grid Ltd that
AG Studio brings (`ag-studio`, `ag-studio-react`, `ag-grid-enterprise`, `ag-charts-enterprise`), and only while they
declare `Commercial`. The notices mark them so, and the README says what their licence asks.

```sh
npx tsx --conditions=rewire-source tools/licences.ts --write   # write THIRD_PARTY_NOTICES.md
npx tsx --conditions=rewire-source tools/licences.ts --check   # fail on an unpermitted licence or stale notices
```

## Data sources

`data-sources.ts` writes `docs/data-sources.md` from the bundle manifest: a summary table, then for each source the
attribution its licence asks for, the adaptation notice when there is one, its link and digest, and the bundle files
derived from it. Build the bundle first with `npm run data:build`.

```sh
npx tsx --conditions=rewire-source tools/data-sources.ts --write
npx tsx --conditions=rewire-source tools/data-sources.ts --check
```

## Listed course snapshots

The marketplace lists real courses of other providers from snapshots in
`packages/content/src/courses/listed/`; `docs/course-catalogue.md` says what each holds.

```sh
# Reads https://learn.microsoft.com/api/catalog/ once, as a common browser, and writes microsoft-learn.json.
npx tsx --conditions=rewire-source tools/capture-microsoft-learn.ts
# The same from an answer saved before, without the network.
npx tsx --conditions=rewire-source tools/capture-microsoft-learn.ts --input <answer.json>
# Writes sepe.json from an official export of the SEPE catalogue, dated by the day of the export.
npx tsx --conditions=rewire-source tools/import-sepe.ts --input <export.json> --exported-on YYYY-MM-DD
```

The Microsoft Learn capture drops the tracking parameter of each address, turns the summary into
one or two sentences of plain text and maps `beginner` to introductory. The SEPE import keeps the
specialties that can be taken online, with an official level from 1 to 5 and stated hours, of the
families of computing and communications, administration and management, and commerce and
marketing; it writes their official names in sentence case and builds each summary only from the
record.

## Library readings

`import-readings.ts` writes the readings of the library from one or more JSON lists in the schema of
`packages/content/src/library/schema.ts`. A document listed in more than one file is kept once, the
first time it appears; then `--per-kind` readings of each kind are kept, with scopes and topics as
even as the candidates allow.

```sh
npx tsx --conditions=rewire-source tools/import-readings.ts --per-kind 25 first.json second.json
```

## Delivery guard

`check-delivery.ts` reads every file that would be published and reports, grouped by rule:

- `no-local-paths`: a home folder, mounted volume or drive letter of a particular machine.
- `no-secrets`: a value shaped like a credential, or a filled-in secret in `.env.example`.
- `no-pending-notes`: a marker of unfinished work.
- `readme-per-folder`: a code folder under `apps`, `packages`, `tools`, `docs` or `tests/e2e` without a `README.md`.
- `max-line-length`: a TypeScript line over 120 characters, not counting quoted URLs.

Two widths apply. Prettier wraps code at 100 characters; the guard rejects only what is still over
120 after that, which is what Prettier cannot break, except quoted URLs and lines that hold a single
message.

```sh
npx tsx --conditions=rewire-source tools/check-delivery.ts   # exits with 1 if anything is found
```

## Rules

- Each program reads the repository, never the network, and runs with
  `tsx --conditions=rewire-source` so that workspace packages are read from their sources. The
  one exception is `capture-microsoft-learn.ts`, run by hand to refresh its snapshot.
- The rules live in pure functions (`*-rules.ts`, `data-sources-doc.ts`) with their tests; the
  programs only read files and print.
