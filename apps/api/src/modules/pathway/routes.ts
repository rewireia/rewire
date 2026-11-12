import { pathwayQuerySchema } from '@rewire/contracts';
import { Hono } from 'hono';

import type { HttpEnvironment } from '../../http/environment.ts';
import { notFound } from '../../http/problem.ts';
import { parseInput, regionOf } from '../../http/validate.ts';

import type { PathwayService } from './pathway-service.ts';

/** The learning plan of an occupation in a region, and the catalogue it draws on. */
export function pathwayRoutes(pathways: PathwayService): Hono<HttpEnvironment> {
  return new Hono<HttpEnvironment>()
    .get('/regions/:region/pathway', async (context) => {
      const region = regionOf(context);
      const { isco08 } = parseInput(pathwayQuerySchema, context.req.query());
      const pathway = await pathways.pathwayFor(region, isco08, context.get('learnerId'));
      if (pathway === undefined) {
        throw notFound('A scored occupation with that code');
      }
      return context.json(pathway);
    })
    .get('/regions/:region/courses/:courseId', async (context) => {
      const courses = await pathways.coursesFor(regionOf(context), context.get('learnerId'));
      const course = courses.find((candidate) => candidate.id === context.req.param('courseId'));
      if (course === undefined) {
        throw notFound('That course');
      }
      return context.json(course);
    });
}
