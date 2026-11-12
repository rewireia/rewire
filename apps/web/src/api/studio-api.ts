import {
  sessionSchema,
  studioTurnResponseSchema,
  type StudioTurnRequest,
  type StudioTurnResponse,
} from '@rewire/contracts';

import { sendJson, type Request } from './request.ts';

/** The analyst of the explorer's "Analyse" view: one turn of Studio's agents, through the server. */
export function studioApi(request: Request) {
  let session: Promise<unknown> | undefined;

  /**
   * The analyst answers only a browser with a session, so one is opened before the first turn
   * and kept. A session that could not be opened is asked for again on the next turn.
   */
  const withSession = (): Promise<unknown> => {
    session ??= request('/session', sessionSchema, sendJson('POST')).catch((error: unknown) => {
      session = undefined;
      throw error;
    });
    return session;
  };

  return {
    async studioTurn(body: StudioTurnRequest, signal?: AbortSignal): Promise<StudioTurnResponse> {
      await withSession();
      return request('/studio/turn', studioTurnResponseSchema, sendJson('POST', body, signal));
    },
  };
}
