# content/src

The content of Rewire and the pure functions that read it.

```text
src/
├── index.ts       the public entry: schemas, types, content and catalogue functions
├── catalogue.ts   every course the marketplace sells, found by id (the content's and those the
│                  seller published, set by the API); demo prices; courses for a job
├── listed-price.ts the sandbox price of a listed course, by bands of its stated hours
├── seller.ts      the one demonstration seller that sells every course; it wrote none
├── schema/        the Zod schemas every piece of content must match
├── regions/       one profile per region
├── courses/       the free courses Rewire links to and the demonstration catalogue
└── library/       the readings of the library, their schema and their import
```
