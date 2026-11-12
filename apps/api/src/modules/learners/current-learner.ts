import type { Context } from 'hono';

import type { HttpEnvironment } from '../../http/environment.ts';
import { HttpProblem } from '../../http/problem.ts';

/**
 * The learner of the request. Acting on an order or a course needs the session that owns
 * it, so a visitor gets a 401 rather than a session made up on the spot.
 */
export function requireLearner(context: Context<HttpEnvironment>): string {
  const learnerId = context.get('learnerId');
  if (learnerId === undefined) {
    throw new HttpProblem({
      status: 401,
      code: 'no_session',
      title: 'No session',
      detail: 'This browser has no session with Rewire. Start again from the course page.',
    });
  }
  return learnerId;
}
