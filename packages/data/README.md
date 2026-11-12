# @rewire/data

The data Rewire ships, and the code that makes and reads it. A pipeline downloads the official
sources, turns them into one common shape and writes a **bundle** of JSON files with a manifest.
At start-up, the loader reads the bundle into memory and checks every file against the manifest.

```text
data/
├── src/            the two entries: schemas, the bundle loader and the bridge coverage measure
├── pipeline/       the build program: download, read, transform, validate and write
├── bundle/         the generated bundle, committed; written only by the pipeline
├── tests/          unit tests of each step and a check of the committed bundle
├── .cache/         downloaded sources, kept between builds; not committed
├── dist/           compiled output of `tsc -b`; not committed
├── package.json    the package and its two entries
└── tsconfig.json   build settings for `src/`
```

## Entries

| Import                | What it holds                                                  | Reads the disk |
| --------------------- | -------------------------------------------------------------- | -------------- |
| `@rewire/data`        | everything: the schemas and types, the loader and the coverage | yes            |
| `@rewire/data/schema` | the schemas of the bundle files and their types, nothing else  | no             |

A package that only validates or types data, such as `@rewire/content`, imports
`@rewire/data/schema`, so it does not pull in the loader and `node:fs`.

## Build and check

```sh
npm run data:build                # download what is not cached, then rewrite bundle/
npm run data:build -- --offline   # rebuild from .cache/ only
npm run data:check                # verify the committed bundle, without the network
```

A build downloads about 150 MB the first time. The check reads only `bundle/` and also prints how
much of each region reaches a scored unit group.

`DATA_PIPELINE_USER_AGENT` is optional. When it is set, every download sends it as its
`User-Agent` header, because some publishers refuse the runtime's default; when it is not, Node's
`fetch` sends its own.

## What the digests guarantee

- Every file source is pinned in `pipeline/sources.ts` by the SHA-256 of its bytes. If a
  publisher changes a file, the download fails instead of building on different data.
- The ESCO API is served page by page and cannot be pinned by digest, so its size is: the build
  fails unless it returns exactly the expected number of occupations. Pages already in `.cache/`
  are used as they are, and pass the same check.
- The Nomis and Eurostat statistics APIs are queried for a fixed period, and their responses
  cannot be pinned by digest either, because a publisher may revise its figures. Their steps check
  what each response describes (unit, period, population) and that it holds at least as many
  records as a complete one; the manifest records the digest of what arrived. A response already in
  `.cache/` is used as it is. A revision that keeps the shape and size is not caught by the
  download: it shows in the diff of `bundle/`.
- `manifest.json` records the SHA-256 and size of every bundle file. `loadDataBundle` refuses,
  with a `BundleIntegrityError`, a file that is not listed, cannot be read or does not match, and a
  manifest that is missing, unreadable or breaks its schema. `npm run data:check` also refuses a JSON file in
  `bundle/` that the manifest does not list.
- The same sources always give the same bytes. The day a source was retrieved is kept while its
  digest is unchanged, so a rebuild does not touch the bundle unless the data changed.
- They do not guarantee that the committed bundle can be rebuilt from the network forever: a
  publisher may revise, move or withdraw a source. This is an accepted limit; the committed bundle
  and its manifest are the reference, and running Rewire never downloads a source.

## Bundle files

| File                       | Contents                                                               | Sources                                             |
| -------------------------- | ---------------------------------------------------------------------- | --------------------------------------------------- |
| `exposure.json`            | ISCO-08 unit groups with their scored tasks                            | ILO Working Paper 140                               |
| `exposure-rationales.json` | the model reasoning behind each task score, read lazily                | ILO Working Paper 140                               |
| `classification.eu.json`   | ESCO occupations in five languages                                     | ESCO v1.2.1                                         |
| `classification.us.json`   | O\*NET-SOC occupations bridged to ISCO-08                              | O\*NET 31.0, ESCO–O\*NET crosswalk, ESCO            |
| `classification.uk.json`   | SOC 2020 unit groups with their coded job titles                       | ONS SOC 2020 coding index                           |
| `labour.eu.json`           | employment by ISCO-08 sub-major group, mean monthly pay by major group | Eurostat `lfsa_egai2d`, `earn_ses22_48`             |
| `labour.us.json`           | employment and median annual wage by SOC occupation                    | BLS OEWS, May 2025                                  |
| `labour.uk.json`           | employment and median annual pay by SOC 2020 unit group                | ONS Annual Population Survey (Nomis), ASHE table 14 |
| `manifest.json`            | digest and size of each file, and every source record                  | all of the above                                    |

Full attributions, licences and adaptation notices are in
[`docs/data-sources.md`](../../docs/data-sources.md), generated from the manifest.

## Rules

- Never edit `bundle/` by hand: change the pipeline and rebuild.
- A new or changed source is pinned in `pipeline/sources.ts` and documented by regenerating
  `docs/data-sources.md`.
- Raise `formatVersion` in `src/schema/manifest.ts` when the shape of a bundle file changes.
- `src/` must not import from `pipeline/`; the pipeline uses `src/` through `src/index.ts`.
- `src/schema/` must not import the loader: it is the entry for packages that do not read the disk.
