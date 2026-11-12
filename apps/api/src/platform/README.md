# platform

The few things the server needs from its machine.

```text
database.ts         opens the libSQL database and applies the migrations in order
clock.ts            the time, passed in wherever it matters
fetch.ts            the shape of an HTTP call out, passed in so tests need no network
openai-responses.ts one request to OpenAI's Responses API, its failures as one error
session-secret.ts   the secret that signs cookies; created locally outside production
```

## Rules

- A migration already applied is never edited: `migrate` refuses to start if its checksum
  changed. Write a new one instead.
- Nothing calls `new Date()`: the migrations, like every business rule, ask the injected `Clock`.
- Foreign keys are switched on for every database `openDatabase` opens, in a file, in memory or
  remote.
