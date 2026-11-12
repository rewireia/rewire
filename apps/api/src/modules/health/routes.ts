import { Hono } from 'hono';

import type { HttpEnvironment } from '../../http/environment.ts';

/** Liveness: the process is up and answering. */
export function healthRoutes(): Hono<HttpEnvironment> {
  return new Hono<HttpEnvironment>().get('/health', (context) => context.json({ status: 'ok' }));
}
