import type { MiddlewareHandler } from 'hono';

import type { HttpEnvironment } from './environment.ts';
import { HttpProblem } from './problem.ts';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * Refuses a request that changes state when a browser sends it from another site.
 *
 * Browsers attach `Origin` to such requests, so one that names a different origin is a
 * cross-site call made with the learner's cookie. Requests without `Origin` do not come
 * from a page and carry no cookie worth stealing. Paths under `exemptPrefix` are called by
 * other servers and prove who they are in their own way.
 */
export function sameOrigin(
  allowedOrigin: string,
  exemptPrefix: string,
): MiddlewareHandler<HttpEnvironment> {
  return async (context, next) => {
    const origin = context.req.header('Origin');
    const exempt = context.req.path.startsWith(exemptPrefix);
    if (
      !SAFE_METHODS.has(context.req.method) &&
      !exempt &&
      origin !== undefined &&
      origin !== allowedOrigin
    ) {
      throw new HttpProblem({
        status: 403,
        code: 'cross_origin',
        title: 'Cross-origin request refused',
      });
    }
    await next();
  };
}
