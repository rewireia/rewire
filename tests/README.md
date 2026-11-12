# tests

Tests that cross the whole product. The tests of each package and application live next to it,
in its own `tests/` folder.

```text
e2e/   the journeys of a person in a browser, over the real API with PayPal and the model
       replaced by doubles, and one journey against the PayPal sandbox (see e2e/README.md)
```

Run them with `npm run e2e`; `npm run e2e:live` runs the sandbox journey when `.env` holds the
credentials.
