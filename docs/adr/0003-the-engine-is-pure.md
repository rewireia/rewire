# 0003. The engine is pure

## Situation

The search and the exposure calculations are the part of the product that must be right, and the part a
reviewer will want to read.

## Decision

`packages/engine` exports functions of their arguments. It reads no file, opens no connection and asks no
clock. The data bundle is loaded by `packages/data` and passed in.

## Consequences

- Every rule has a fast unit test, and the tests with the real bundle run in a second.
- The same engine can run in a server, a worker or a browser.
- Anything that needs the outside world lives in `apps/api`, behind an interface.
