# analyst

Rewire's analyst, an agent of its own on AG Studio's agent framework. Studio runs the agents and
every tool in the browser; each turn goes to the model through `POST /api/studio/turn`, so the key
stays on the server. Offered only when `GET /api/guide/status` says the server has a model.

```
analyst-harness.ts   the harness: Rewire's agent first, Studio's data, page and widget agents
                     behind it on the same model, and the suggestions to start with
instructions.ts      what the analyst knows of the data and its limits, and where figures may come from
occupation-tool.ts   its own tool, read_occupation_tasks: an occupation's tasks and scores from Rewire
analyst-adapter.ts   AG Studio's AgLlmAdapter over the server's route
turn-mapping.ts      a turn of Studio as the contract carries it, and the answer as Studio's events
```

## Rules

- The analyst states only figures a query or its own tool returned, says they come from the ILO,
  2025, and that exposure is technical potential, not job losses. This is asked in its
  instructions; unlike the guide's explanations, it is not checked in code.
- To query, change a widget or filter the page, it delegates to Studio's agents (`delegate_to`).
- The model's reasoning is not carried from one turn to the next; pictures and files are not sent.
