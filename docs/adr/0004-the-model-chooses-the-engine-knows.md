# 0004. The model chooses, the engine knows

## Situation

A language model understands a job described in free words far better than a word search, and explains a
report more naturally than a template. It also states figures that do not exist, with full confidence.

## Decision

The model is never a source of facts. It works through tools that read the engine and the catalogue, and
each of its outputs is checked in code: an occupation it proposes must be one a search returned in the
same request, and every number in an explanation must be found in the facts it was given.

## Consequences

- A hallucinated occupation code or score cannot reach the person: the check refuses it.
- The product works without a model. The guide improves the experience and is not a dependency of it.
- The rules are testable with a scripted model, without the network.
- See [ai-guide.md](../ai-guide.md).
