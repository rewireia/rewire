import { randomUUID } from 'node:crypto';

import type { Problem } from '@rewire/contracts';
import type { ErrorHandler, MiddlewareHandler, NotFoundHandler } from 'hono';

import type { Logger } from '../logger.ts';

import type { HttpEnvironment } from './environment.ts';
import { HttpProblem } from './problem.ts';

const PROBLEM_JSON = 'application/problem+json';

/** Gives every request an id, returned in `X-Request-Id`, and logs how it ended. */
export function requestLog(logger: Logger): MiddlewareHandler<HttpEnvironment> {
  return async (context, next) => {
    const requestId = randomUUID();
    const startedAt = performance.now();
    context.set('requestId', requestId);
    context.header('X-Request-Id', requestId);
    await next();
    logger.info('request', {
      requestId,
      method: context.req.method,
      path: context.req.path,
      status: context.res.status,
      milliseconds: Math.round(performance.now() - startedAt),
    });
  };
}

/**
 * Turns every error into a problem answer. A problem raised on purpose is sent as it is;
 * anything else is logged with its cause and answered as a 500 that reveals nothing.
 */
export function problemHandler(logger: Logger): ErrorHandler<HttpEnvironment> {
  return (error, context) => {
    const requestId = context.get('requestId');
    if (error instanceof HttpProblem) {
      const problem: Problem = {
        status: error.status,
        code: error.code,
        title: error.title,
        ...(error.detail === undefined ? {} : { detail: error.detail }),
        ...(error.issues === undefined ? {} : { issues: error.issues }),
        requestId,
      };
      return context.json(problem, error.status, { 'Content-Type': PROBLEM_JSON });
    }
    logger.error('unhandled error', { requestId, error: String(error), stack: error.stack });
    const problem: Problem = {
      status: 500,
      code: 'internal_error',
      title: 'Internal error',
      detail: 'Something went wrong on our side. Try again in a moment.',
      requestId,
    };
    return context.json(problem, 500, { 'Content-Type': PROBLEM_JSON });
  };
}

export const routeNotFound: NotFoundHandler<HttpEnvironment> = (context) => {
  const problem: Problem = {
    status: 404,
    code: 'not_found',
    title: 'Not found',
    detail: `No route answers ${context.req.method} ${context.req.path}.`,
    requestId: context.get('requestId'),
  };
  return context.json(problem, 404, { 'Content-Type': PROBLEM_JSON });
};
