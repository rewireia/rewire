import { Hono } from 'hono';
import { z } from 'zod';

import type { HttpEnvironment } from '../../http/environment.ts';
import { HttpProblem } from '../../http/problem.ts';
import { parseBody } from '../../http/validate.ts';

import type { Sessions } from './session.ts';

const credentials = z
  .object({
    username: z.string().max(80),
    password: z.string().max(80),
    role: z.enum(['learner', 'business']).default('learner'),
  })
  .strict();

/** Publicly documented credentials for the shared demo learner and business workspaces. */
export function accessRoutes(sessions: Sessions) {
  return new Hono<HttpEnvironment>()
    .post('/session/sign-in', async (context) => {
      const input = await parseBody(context, credentials);
      if (input.username.toLowerCase() !== 'rewire' || input.password !== 'DemoDemoDemo') {
        throw new HttpProblem({
          status: 401,
          code: 'invalid_credentials',
          title: 'Invalid demo credentials',
        });
      }
      await sessions.authenticate(context, input.role);
      return context.json({ authenticated: true });
    })
    .post('/session/sign-out', (context) => {
      sessions.signOut(context);
      return context.json({ authenticated: false });
    });
}
