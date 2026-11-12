import { Hono, type MiddlewareHandler } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import { compress } from 'hono/compress';
import { secureHeaders } from 'hono/secure-headers';

import type { HttpEnvironment } from './http/environment.ts';
import { problemHandler, requestLog, routeNotFound } from './http/middleware.ts';
import { HttpProblem } from './http/problem.ts';
import { sameOrigin } from './http/same-origin.ts';
import { webFiles } from './http/web-files.ts';
import type { Logger } from './logger.ts';

export interface AppOptions {
  readonly logger: Logger;
  /** Where the web is served from: the only origin allowed to change state. */
  readonly publicOrigin: string;
  /** Reads the session cookie of every request. */
  readonly session: MiddlewareHandler<HttpEnvironment>;
  /** The routes of every module, each mounted under `/api`. */
  readonly modules: readonly Hono<HttpEnvironment>[];
  /** The folder of the built web, when this server serves it too. */
  readonly webRoot?: string | undefined;
}

/** No request body of the API comes near this size, but for the routes below. */
const MAXIMUM_BODY_BYTES = 64 * 1024;
/**
 * Routes that set a larger limit of their own: the analyst's turn carries a whole conversation
 * with AG Studio's tools (see `modules/analyst/routes.ts`).
 */
const OWN_BODY_LIMIT_PATHS: ReadonlySet<string> = new Set(['/api/studio/turn']);
/** Called by PayPal's servers, which sign their requests instead of sharing our origin. */
const WEBHOOK_PREFIX = '/api/webhooks/';

/**
 * Builds the HTTP application: the middleware every request crosses, then the API and,
 * when this server serves it too, the web. It opens no port and reads no environment, so
 * tests call it with `app.request(...)`.
 */
export function createApp(options: AppOptions): Hono<HttpEnvironment> {
  const app = new Hono<HttpEnvironment>()
    .use(requestLog(options.logger))
    // PayPal approves a payment in a window of its own, which must be able to answer the
    // page that opened it.
    .use(secureHeaders({ crossOriginOpenerPolicy: 'same-origin-allow-popups' }))
    .use(compress())
    .route('/api', createApi(options));
  if (options.webRoot !== undefined) {
    app.route('/', webFiles(options.webRoot));
  }
  return app.notFound(routeNotFound).onError(problemHandler(options.logger));
}

/** The modules, behind what only a call to the API needs: a body limit, its origin, a session. */
function createApi({ publicOrigin, session, modules }: AppOptions): Hono<HttpEnvironment> {
  const limit = bodyLimit({
    maxSize: MAXIMUM_BODY_BYTES,
    onError: () => {
      throw new HttpProblem({ status: 413, code: 'too_large', title: 'Request too large' });
    },
  });
  const api = new Hono<HttpEnvironment>()
    .use((context, next) =>
      OWN_BODY_LIMIT_PATHS.has(context.req.path) ? next() : limit(context, next),
    )
    .use(sameOrigin(publicOrigin, WEBHOOK_PREFIX))
    .use(session);
  for (const module of modules) {
    api.route('/', module);
  }
  // Answered here, so that a wrong address of the API is never taken for a page of the web.
  return api.all('*', routeNotFound);
}
