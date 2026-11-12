import type { DataSourceList } from '@rewire/contracts';
import type { BundleManifest } from '@rewire/data';
import { Hono } from 'hono';

import type { HttpEnvironment } from '../../http/environment.ts';

/** The official sources behind every figure, with the credit their licences ask for. */
export function sourceRoutes(manifest: BundleManifest): Hono<HttpEnvironment> {
  const list: DataSourceList = {
    sources: manifest.sources.map((source) => ({
      id: source.id,
      title: source.title,
      publisher: source.publisher,
      version: source.version,
      url: source.url,
      licence: source.licence,
      attribution: source.attribution,
      adaptationNotice: source.adaptationNotice ?? null,
      retrievedOn: source.retrievedOn,
    })),
  };
  return new Hono<HttpEnvironment>().get('/sources', (context) => context.json(list));
}
