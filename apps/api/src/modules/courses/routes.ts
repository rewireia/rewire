import { catalogueSearchRequestSchema, courseCatalogueQuerySchema } from '@rewire/contracts';
import { Hono } from 'hono';
import { etag } from 'hono/etag';

import type { HttpEnvironment } from '../../http/environment.ts';
import { parseBody, parseInput, regionOf } from '../../http/validate.ts';

import type { CourseCatalogueService } from './catalogue-service.ts';
import { COURSE_SOURCES } from './sources.ts';

/** The course catalogue of a region, and the search of it in a person's own words. */
export function courseRoutes(courses: CourseCatalogueService): Hono<HttpEnvironment> {
  return (
    new Hono<HttpEnvironment>()
      // The catalogue is large and changes rarely: the browser keeps it and asks only whether it
      // changed. It holds the learner's standing, so it is kept for that browser alone.
      .use('/regions/:region/courses', etag())
      .get('/regions/:region/courses', async (context) => {
        const region = regionOf(context);
        const { language } = parseInput(courseCatalogueQuerySchema, context.req.query());
        const catalogue = await courses.catalogue(region, language, context.get('learnerId'));
        context.header('Cache-Control', 'private, no-cache');
        return context.json(catalogue);
      })
      .get('/courses/sources', (context) => context.json(COURSE_SOURCES))
      // What the person writes is used for this answer only: it is neither stored nor logged.
      .post('/courses/search', async (context) =>
        context.json(await courses.search(await parseBody(context, catalogueSearchRequestSchema))),
      )
  );
}
