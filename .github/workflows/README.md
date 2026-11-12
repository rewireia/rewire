# workflows

What GitHub runs on every push to `main` and on every pull request.

```text
verify.yml   the quality gate (`npm run verify`) and the browser journeys (`npm run e2e`)
```

Neither job needs a credential: PayPal and the language model are replaced by doubles.
