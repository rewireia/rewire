import type { ReadingContent } from '@rewire/content';
import { libraryQuerySchema } from '@rewire/contracts';
import { Hono } from 'hono';

import type { HttpEnvironment } from '../../http/environment.ts';
import { parseInput } from '../../http/validate.ts';

import { libraryIn } from './present.ts';

/** The library changes only with a release of Rewire: a browser and a cache may keep it a day. */
const CACHE_POLICY = 'public, max-age=86400';

/**
 * GET /library?language=en|es: the readings of the library, with why each may interest the
 * reader in the language asked for. Both answers are made once, at start-up.
 */
export function libraryRoutes(readings: readonly ReadingContent[]): Hono<HttpEnvironment> {
  const answers = { en: libraryIn(readings, 'en'), es: libraryIn(readings, 'es') };
  return new Hono<HttpEnvironment>().get('/library', (context) => {
    const { language } = parseInput(libraryQuerySchema, {
      language: context.req.query('language'),
    });
    context.header('Cache-Control', CACHE_POLICY);
    return context.json(answers[language]);
  });
}
