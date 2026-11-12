import { studioTurnRequestSchema, type StudioTurnResponse } from '@rewire/contracts';
import { Hono } from 'hono';
import { bodyLimit } from 'hono/body-limit';

import type { HttpEnvironment } from '../../http/environment.ts';
import { HttpProblem } from '../../http/problem.ts';
import { parseBody } from '../../http/validate.ts';
import { OpenAiCallError } from '../../platform/openai-responses.ts';
import { withinBudget, type TokenBudget } from '../guide/token-budget.ts';
import { requireLearner } from '../learners/current-learner.ts';

import { StudioModelError, type StudioModel } from './studio-model.ts';
import { admitTurn } from './turn-policy.ts';

/**
 * A turn carries Studio's instructions, the schemas of its tools and the whole conversation with
 * the results of its queries: about 40 kB when it starts, more as it goes on. The rest of the API
 * keeps its limit of 64 kB.
 */
export const STUDIO_TURN_MAXIMUM_BYTES = 1024 * 1024;
const STUDIO_TURN_PATH = '/studio/turn';

export interface AnalystRouteDependencies {
  /** `undefined` when the server has no AI key: the analyst is then not offered. */
  readonly model: StudioModel | undefined;
  /** The analyst's own daily budget, apart from the guide's. */
  readonly budget: TokenBudget;
}

/**
 * The analyst of the explorer's "Analyse" view: one turn of Studio's agents, carried to the
 * model for a browser that has a session, one turn at a time per session.
 */
export function analystRoutes({ model, budget }: AnalystRouteDependencies): Hono<HttpEnvironment> {
  const answering = new Set<string>();
  return new Hono<HttpEnvironment>().post(
    STUDIO_TURN_PATH,
    bodyLimit({
      maxSize: STUDIO_TURN_MAXIMUM_BYTES,
      onError: () => {
        throw new HttpProblem({ status: 413, code: 'too_large', title: 'Request too large' });
      },
    }),
    async (context) => {
      if (model === undefined) {
        throw unavailable();
      }
      const learnerId = requireLearner(context);
      const turn = admitTurn(await parseBody(context, studioTurnRequestSchema));
      if (answering.has(learnerId)) {
        throw busy();
      }
      answering.add(learnerId);
      try {
        const response = await answer(() =>
          withinBudget(
            budget,
            (tokenLimit) => model.turn(turn, tokenLimit),
            ({ usage }) => usage.inputTokens + usage.outputTokens,
          ),
        );
        return context.json(response);
      } finally {
        answering.delete(learnerId);
      }
    },
  );
}

/** Runs a turn and turns the model's failures into problems, once the budget has counted them. */
async function answer(run: () => Promise<StudioTurnResponse>): Promise<StudioTurnResponse> {
  try {
    return await run();
  } catch (error) {
    if (error instanceof StudioModelError || error instanceof OpenAiCallError) {
      throw new HttpProblem({
        status: 502,
        code: error instanceof StudioModelError ? `guide_${error.reason}` : 'guide_unavailable',
        title: 'The analyst could not answer',
        detail: 'The analyst did not complete its answer. Try again, or carry on without it.',
      });
    }
    throw error;
  }
}

function busy(): HttpProblem {
  return new HttpProblem({
    status: 429,
    code: 'analyst_busy',
    title: 'The analyst is still answering',
    detail: 'The analyst is still working on your previous question. Wait for its answer.',
  });
}

function unavailable(): HttpProblem {
  return new HttpProblem({
    status: 503,
    code: 'guide_unavailable',
    title: 'The analyst is not set up',
    detail: 'This server has no AI credentials. Everything else works without the analyst.',
  });
}
