import type { StudioTurnRequest, StudioTurnResponse } from '@rewire/contracts';
import type { AgLlmAdapter } from 'ag-studio';

import { eventsOf, failedResponseOf, llmResponseOf, turnRequestOf } from './turn-mapping.ts';

/** Carries one turn to Rewire's server, which asks the model. */
export type SendTurn = (
  body: StudioTurnRequest,
  signal?: AbortSignal,
) => Promise<StudioTurnResponse>;

/**
 * The model behind every agent of the analyst, as AG Studio's `AgLlmAdapter`. The server answers a
 * whole turn at once; the adapter replays it as the events Studio's chat panel expects. The key of
 * the model stays on the server.
 */
export function createAnalystAdapter(send: SendTurn, now: () => number = Date.now): AgLlmAdapter {
  return {
    executeTurn(request, options) {
      const answer = send(turnRequestOf(request), options?.signal);
      return {
        stream: {
          async *[Symbol.asyncIterator]() {
            yield* eventsOf(await answer);
          },
        },
        complete: answer.then(
          (response) => llmResponseOf(response, now()),
          (error: unknown) => failedResponseOf(error, now()),
        ),
      };
    },
  };
}
