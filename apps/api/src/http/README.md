# http

What every request has in common, whatever module answers it.

```text
environment.ts   the variables middleware stores on a request: request id and learner id
middleware.ts    request id and log line, problem answers for errors, the 404 of unknown routes
problem.ts       HttpProblem, the error a handler throws to answer a problem
same-origin.ts   refuses state changes sent by a browser from another site
validate.ts      parses untrusted input and JSON bodies with a Zod schema, and the region of a path
web-files.ts     serves the built web next to the API, with `index.html` for its pages
```

## Rules

- Handlers never build error bodies: they throw `HttpProblem`, and `problemHandler` answers it
  as `application/problem+json` with the request id.
- `code` is stable and meant for programs; `detail` is written for people.
- A body that is not JSON is a 400 `invalid_json`; a region that does not exist is a 404, like any
  missing resource.
