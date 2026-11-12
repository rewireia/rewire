# data/pipeline/readers

Turn the bytes of a downloaded source into plain records keyed by column title.

```text
readers/
├── csv.ts           CSV text, with a byte order mark or notes above the header line
├── spreadsheet.ts   one sheet of an .xlsx workbook, its first row (or a named one) as titles
└── json-stat.ts     a JSON-stat 2.0 dataset read along one dimension, the others fixed
```

## Rules

- Readers know nothing of any source: the steps validate what they return.
