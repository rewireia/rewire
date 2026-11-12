# analyst

The analyst of the explorer's "Analyse" view. AG Studio, in the browser, runs Rewire's agent and
its own agents and executes every tool; this module bounds one turn and carries it to the model
and back.

```text
routes.ts         POST /api/studio/turn: its own body limit (1 MB), a session, one turn at a
                  time per session, its own budget, problems
turn-policy.ts    what a turn may be: the server's purpose first, and only the dashboard's tools
studio-model.ts   the model behind a turn, and the OpenAI one through the Responses API
```

## Rules

- A turn is validated with `studioTurnRequestSchema` and then `admitTurn` before it reaches the
  model. The answer holds only the model's text and tool calls; its reasoning stays on the server
  and is not carried back.
- Only a browser with a session is answered: without one the route answers `401 no_session`. The
  web starts one with `POST /api/session` before the first turn. A session already waiting for a
  turn is answered `429 analyst_busy` until that turn ends.
- The server's purpose (`ANALYST_PURPOSE`: analyse this data set and arrange its dashboard,
  decline anything else) is the first item of every turn and its only system message. The
  client's instructions and any system message of its conversation go in after it as developer
  messages, which rank below it.
- A turn may offer, replay or force only the tools in `ANALYST_TOOLS`, each at most once and
  within a size; otherwise `400 analyst_tool_not_allowed` or `400 analyst_tools_too_large`, with
  the tools named in `issues`. The analyst's own tool (`read_occupation_tasks`) is defined in
  `SERVER_TOOLS` and replaces whatever the page sent with its name. Studio's tools are built in the
  page from the dashboard's live state, so their descriptions and schemas are bounded, not fixed.
- The analyst has a daily budget of its own (`ANALYST_DAILY_TOKEN_BUDGET`), apart from the guide's.
  Each turn sets its limit aside before it starts (20,000 tokens) and asks the model for no more
  output than that: `429 guide_budget_spent` when the day has no room for it, `429 guide_busy` when
  four turns are already at the model. What OpenAI reports a turn spent is counted, also when the
  answer is refused or failed.
- Without an AI key the route answers `503 guide_unavailable` and the web does not offer the
  analyst. Nothing is kept at OpenAI (`store: false`), and nothing of a turn is kept here.

## What this does not do

It bounds who may call the model (a browser with a session, which anyone can start), how much
(one turn at a time per session, four at once in all, a daily budget) and for what (the purpose
and the tools). It does not make the model harmless or its answers right: the client still writes
the conversation, and the model may follow it badly or misstate the data. Unlike the guide, the
analyst writes figures, read from its queries and its tool: neither the guide's rule against
figures nor its check for forecasts of job loss applies to it, and the guide's promise does not
cover it.
