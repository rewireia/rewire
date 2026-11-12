import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { serveStatic } from '@hono/node-server/serve-static';
import { Hono, type MiddlewareHandler } from 'hono';
import { etag } from 'hono/etag';

import { ConfigError } from '../config.ts';

import type { HttpEnvironment } from './environment.ts';
import { routeNotFound } from './middleware.ts';

/** The folder of the API package: a relative folder of the web is resolved against it. */
const PACKAGE_DIRECTORY = fileURLToPath(new URL('../../', import.meta.url));

/** The build names every file under `assets/` after its content, so it never changes. */
const ASSETS_PREFIX = '/assets/';
const NEVER_CHANGES = 'public, max-age=31536000, immutable';
/** Kept by the browser, and checked with the server, by its entity tag, before every use. */
const CHECK_FIRST = 'no-cache';
const HOME_PAGE = 'index.html';

/**
 * Serves the built web next to the API, so that one origin is enough in production. A path
 * that names no file is a page of the web application, which routes it in the browser, so
 * it gets the home page. A missing file under `assets/` is not a page: it is a 404, so that
 * the home page is never kept under the name of a script.
 *
 * A folder without a home page holds no build of the web: the server refuses to start
 * rather than answer every page with a 404.
 */
export function webFiles(folder: string): Hono<HttpEnvironment> {
  const root = path.resolve(PACKAGE_DIRECTORY, folder);
  if (!existsSync(path.join(root, HOME_PAGE))) {
    throw new ConfigError(`WEB_ROOT: ${root} holds no ${HOME_PAGE}; build the web first`);
  }
  return new Hono<HttpEnvironment>()
    .get(`${ASSETS_PREFIX}*`, cacheControl(NEVER_CHANGES), serveStatic({ root }), routeNotFound)
    .use(cacheControl(CHECK_FIRST), etag())
    .use(serveStatic({ root }))
    .get('*', serveStatic({ root, path: HOME_PAGE }));
}

/** Tells the browser how long it may keep what was found. */
function cacheControl(policy: string): MiddlewareHandler<HttpEnvironment> {
  return async (context, next) => {
    await next();
    if (context.res.ok) {
      context.header('Cache-Control', policy);
    }
  };
}
