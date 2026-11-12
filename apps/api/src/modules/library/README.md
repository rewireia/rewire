# library

```text
routes.ts    GET /library?language=en|es: the readings of the library, static and cacheable
present.ts   a reading as the API serves it, with why it may interest the reader in one language
```

The readings are editorial content of `@rewire/content`, checked when that module loads. The
answer for each language is made once, at start-up, and carries `Cache-Control: public` for a day.
