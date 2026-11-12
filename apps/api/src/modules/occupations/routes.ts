import {
  occupationDetailQuerySchema,
  occupationLabourQuerySchema,
  occupationSearchQuerySchema,
  type OccupationLabour,
  type OccupationSearchResult,
} from '@rewire/contracts';
import type { BundleManifest } from '@rewire/data';
import type { Engine } from '@rewire/engine';
import { Hono } from 'hono';

import type { HttpEnvironment } from '../../http/environment.ts';
import { notFound } from '../../http/problem.ts';
import { parseInput, regionOf } from '../../http/validate.ts';

import { createSourceLookup, presentFigure } from './labour.ts';
import { presentDetail, presentMatch } from './present.ts';

/** Finding the occupation behind a job title, and the labour market around it. */
export function occupationRoutes(engine: Engine, manifest: BundleManifest): Hono<HttpEnvironment> {
  const sourceOf = createSourceLookup(manifest);

  return new Hono<HttpEnvironment>()
    .get('/regions/:region/occupations', (context) => {
      const region = regionOf(context);
      const query = parseInput(occupationSearchQuerySchema, context.req.query());
      const matches = engine.searchOccupations(region, query.q, {
        limit: query.limit,
        // English is the language every classification is published in.
        preferredLanguages: query.lang === undefined ? ['en'] : [query.lang, 'en'],
      });
      const result: OccupationSearchResult = {
        query: query.q,
        matches: matches.map((match) => presentMatch(engine, match)),
      };
      return context.json(result);
    })
    .get('/regions/:region/occupations/:code', (context) => {
      const occupation = engine.findOccupation(regionOf(context), context.req.param('code'));
      const { isco08 } = parseInput(occupationDetailQuerySchema, context.req.query());
      const detail =
        occupation === undefined ? undefined : presentDetail(engine, occupation, isco08);
      if (detail === undefined) {
        throw notFound('That occupation');
      }
      return context.json(detail);
    })
    .get('/regions/:region/labour', (context) => {
      const region = regionOf(context);
      const { code, isco08 } = parseInput(occupationLabourQuerySchema, context.req.query());
      const { employment, pay } = engine.occupationLabour(region, { occupationCode: code, isco08 });
      const labour: OccupationLabour = {
        employment:
          employment === undefined
            ? null
            : { ...presentFigure(employment, sourceOf), counts: employment.counts },
        pay:
          pay === undefined
            ? null
            : { ...presentFigure(pay, sourceOf), currency: pay.currency, measure: pay.measure },
      };
      return context.json(labour);
    });
}
