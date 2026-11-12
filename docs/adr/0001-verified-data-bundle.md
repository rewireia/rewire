# 0001. A verified data bundle

## Situation

The product rests on ten public sources from six publishers, served as spreadsheets, CSV files, a paged
collection and statistics APIs. A reviewer must be able to run it without downloading any of them, and
to check where every figure comes from.

## Decision

`packages/data` has two halves. The **pipeline** downloads each source and pins it in one of three
ways, validates every row with a schema, and writes a **bundle** of JSON files with a manifest that
records the digest of each file and the licence and attribution of each source:

- **Files** are checked against a pinned SHA-256.
- **A paged collection**, which cannot be pinned by digest, is checked by shape and size: it must
  announce and return exactly the expected number of records.
- **A statistics API query** asks for a fixed period; its response is checked by shape (unit, period,
  population) and must hold at least a set number of records. A publisher may revise its figures, so
  the manifest records the digest of what arrived instead of comparing it with a pin.

Downloads are kept in `.cache/`, which is not committed. A cached file is used only while it matches
its pin; cached pages and API responses are used as they are, and pass the same checks of shape and
size as fresh ones.

The bundle is committed. At start-up the server checks every file against the manifest before using it.

## Consequences

- Running the product reads only the committed bundle: no source is downloaded. `npm ci` itself needs
  the network, or an npm cache that already holds every package of the lockfile (`npm ci --offline`).
  The features written by AI and the payments call their providers; the data and the engine do not.
- A pinned file that changes upstream fails the build with a message instead of changing the product
  silently. A paged collection or an API response that changes while keeping its shape and size is
  not detected by the download; the new bytes reach the manifest with their digest, and the change
  shows in the diff of `bundle/`.
- `npm run data:build` rebuilds the bundle from the sources as they are served today, and
  `npm run data:build -- --offline` from `.cache/`. Rebuilding the committed bundle exactly is not
  guaranteed: a publisher may revise, move or withdraw a source. This is an accepted limit; the
  committed bundle and its manifest are the reference.
- The documentation of the sources is generated from the manifest, and `npm run check:sources` fails
  when it no longer matches.
- The repository carries about 21.6 MB of data.
