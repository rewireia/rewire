import { findSellableCourse, listedPrices } from '@rewire/content';
import {
  catalogueSearchResultSchema,
  courseCatalogueSchema,
  courseSourceListSchema,
  listedEnrolmentSchema,
  type CatalogueSearchRequest,
} from '@rewire/contracts';
import { afterEach, describe, expect, it } from 'vitest';

import { GuideModelError } from '../src/modules/guide/model.ts';

import { bodyOf, type TestClient } from './support/client.ts';
import { createScriptedModel, type Script } from './support/scripted-model.ts';
import {
  buyCourse,
  createTestApi,
  expectProblem,
  signInDemo,
  type TestApi,
} from './support/test-api.ts';

const LISTED_ID = 'mslearn-sc-200t00';
const HOSTED_ID = 'ai-foundations';

let api: TestApi | undefined;

afterEach(async () => {
  await api?.close();
  api = undefined;
});

async function start(script?: Script) {
  const model = script === undefined ? null : createScriptedModel(script);
  api = await createTestApi({ overrides: { model } });
  return { server: api, client: api.client(), model };
}

async function catalogueOf(client: TestClient, region: string, language = 'en') {
  return bodyOf(
    await client.get(`/api/regions/${region}/courses?language=${language}`),
    200,
    courseCatalogueSchema,
  );
}

async function search(client: TestClient, request: Partial<CatalogueSearchRequest>) {
  return bodyOf(
    await client.post('/api/courses/search', { region: 'us', language: 'en', ...request }),
    200,
    catalogueSearchResultSchema,
  );
}

describe('the course catalogue of a region', () => {
  it('lists the hosted and the listed courses at the price the server sets', async () => {
    const { client } = await start();
    const catalogue = await catalogueOf(client, 'uk');
    const kinds = new Set(catalogue.courses.map((course) => course.kind));
    expect(kinds).toEqual(new Set(['hosted', 'listed']));
    const listed = catalogue.courses.find((course) => course.id === LISTED_ID);
    const sellable = findSellableCourse(LISTED_ID);
    expect(listed).toMatchObject({
      provider: 'Microsoft Learn',
      providerAccess: 'free',
      enrolment: 'none',
      price: { currency: 'GBP', minorUnits: listedPrices(sellable?.hours ?? null).GBP },
    });
    expect(listed?.url).toMatch(/^https:\/\/learn\.microsoft\.com\//);
    expect(catalogue.sources.map((source) => source.provider)).toEqual(['Microsoft Learn']);
  });

  it('sells the SEPE specialties in the EU only, cited with the day of the export', async () => {
    const { client } = await start();
    const isSepe = (id: string) => id.startsWith('sepe-');
    expect((await catalogueOf(client, 'us')).courses.some((course) => isSepe(course.id))).toBe(
      false,
    );
    const eu = await catalogueOf(client, 'eu', 'es');
    expect(eu.courses.filter((course) => isSepe(course.id)).length).toBeGreaterThan(1000);
    expect(eu.sources.map((source) => source.citation)).toContain(
      'Origen de los datos: SEPE, Catálogo de Especialidades Formativas (exportado el 27/09/2026).',
    );
  });

  it('names its subjects in the language asked for and keeps the provider titles', async () => {
    const { client } = await start();
    const catalogue = await catalogueOf(client, 'us', 'es');
    expect(catalogue.topics.find((topic) => topic.id === 'cybersecurity')?.label).toBe(
      'Ciberseguridad y privacidad',
    );
    const listed = catalogue.courses.find((course) => course.id === LISTED_ID);
    expect(listed?.title).toBe(findSellableCourse(LISTED_ID)?.title);
    const hosted = catalogue.courses.find((course) => course.id === HOSTED_ID);
    expect(hosted?.title).toBe('Fundamentos de IA generativa');
  });

  it('puts the courses offered in the language asked for first', async () => {
    const { client } = await start();
    const { courses } = await catalogueOf(client, 'eu', 'es');
    const offered = courses.map((course) => course.languages.includes('es'));
    expect(offered.indexOf(false)).toBeGreaterThan(0);
    expect(offered.slice(offered.indexOf(false))).not.toContain(true);
  });

  it('applies the terms the business sets on a listed course', async () => {
    const { server, client } = await start();
    const business = server.client();
    await signInDemo(business, 'business');
    const terms = { courseId: LISTED_ID, region: 'us', priceMinor: 4200, minimumMinor: 3000 };
    const put = (published: boolean) =>
      business.put(`/api/business/catalogue/${LISTED_ID}`, { ...terms, published });
    expect((await put(true)).status).toBe(200);
    const priced = (await catalogueOf(client, 'us')).courses.find((c) => c.id === LISTED_ID);
    expect(priced?.price).toEqual({ currency: 'USD', minorUnits: 4200 });
    expect((await put(false)).status).toBe(200);
    const hidden = (await catalogueOf(client, 'us')).courses.find((c) => c.id === LISTED_ID);
    expect(hidden).toBeUndefined();
  });

  it('is a 404 for a region that does not exist, and a 400 for an unknown language', async () => {
    const { client } = await start();
    await expectProblem(await client.get('/api/regions/mars/courses'), 404, 'not_found');
    await expectProblem(
      await client.get('/api/regions/us/courses?language=fr'),
      400,
      'invalid_input',
    );
  });
});

describe('the sources of the listed courses', () => {
  it('name the three origins with their counts, citations and dates', async () => {
    const { client } = await start();
    const { sources } = await bodyOf(
      await client.get('/api/courses/sources'),
      200,
      courseSourceListSchema,
    );
    expect(sources.map((source) => source.kind)).toEqual([
      'hand-checked',
      'catalogue-api',
      'official-export',
    ]);
    expect(sources[0]).toMatchObject({ provider: null, citation: null });
    expect(sources[0]?.providers).toBeGreaterThan(1);
    expect(sources[1]).toMatchObject({ provider: 'Microsoft Learn', courses: 969 });
    expect(sources[2]).toMatchObject({
      citation:
        'Origen de los datos: SEPE, Catálogo de Especialidades Formativas (exportado el 27/09/2026).',
      capturedOn: '2026-09-27',
    });
  });
});

describe('the course search', () => {
  it('finds courses by the words of their title, without a model', async () => {
    const { client } = await start();
    const result = await search(client, { query: 'Power BI reports and dashboards' });
    expect(result.engine).toBe('rules');
    expect(result.matches.length).toBeGreaterThan(0);
    for (const match of result.matches) {
      expect(match.reason).toBeNull();
      expect(findSellableCourse(match.courseId)?.title).toMatch(/power bi|report|dashboard/i);
    }
  });

  it('finds courses written in English for a request in Spanish', async () => {
    const { client } = await start();
    const result = await search(client, {
      language: 'es',
      query: 'quiero aprender ciberseguridad y privacidad',
    });
    expect(result.matches.length).toBeGreaterThan(0);
    for (const match of result.matches) {
      expect(findSellableCourse(match.courseId)?.topics).toContain('cybersecurity');
    }
  });

  it('finds the SEPE specialties for a request in Spanish in the EU', async () => {
    const { client } = await start();
    const result = await search(client, { region: 'eu', language: 'es', query: 'contabilidad' });
    expect(result.matches.some((match) => match.courseId.startsWith('sepe-'))).toBe(true);
  });

  it('leaves out the courses already proposed, and finds nothing in words without a subject', async () => {
    const { client } = await start();
    const first = await search(client, { query: 'Power BI reports' });
    const again = await search(client, {
      query: 'Power BI reports',
      exclude: first.matches.map((match) => match.courseId),
    });
    const shown = new Set(first.matches.map((match) => match.courseId));
    expect(again.matches.some((match) => shown.has(match.courseId))).toBe(false);
    expect((await search(client, { query: 'I want to learn something' })).matches).toEqual([]);
  });

  it('lets the model choose among the candidates only, and keeps only reasons it can show', async () => {
    const { client, model } = await start(({ request }) => {
      const input = JSON.parse(request.turns[0]?.text ?? '{}') as { courses: { id: string }[] };
      const [first, second] = input.courses.map((course) => course.id);
      return JSON.stringify({
        matches: [
          { id: 'invented-course', reason: 'It does not exist.' },
          { id: second, reason: 'It teaches Power BI reports step by step.' },
          { id: first, reason: 'It takes 3 hours.' },
          { id: second, reason: 'Again.' },
        ],
      });
    });
    const result = await search(client, { query: 'Power BI reports' });
    expect(result.engine).toBe('ai');
    expect(result.matches).toHaveLength(2);
    expect(result.matches[0]?.reason).toBe('It teaches Power BI reports step by step.');
    expect(result.matches[1]?.reason).toBeNull();
    const sent = model?.requests[0]?.turns[0]?.text ?? '';
    expect(JSON.parse(sent)).toMatchObject({ request: 'Power BI reports' });
  });

  it('falls back on its own order when the model fails or chooses nothing it offered', async () => {
    const { client } = await start(() => {
      throw new GuideModelError('unavailable');
    });
    const failed = await search(client, { query: 'Power BI reports' });
    expect(failed.engine).toBe('rules');
    expect(failed.matches.length).toBeGreaterThan(0);
    await api?.close();
    const second = await start(() =>
      JSON.stringify({ matches: [{ id: 'invented', reason: 'x' }] }),
    );
    expect((await search(second.client, { query: 'Power BI reports' })).engine).toBe('rules');
  });
});

describe('a listed course bought in the sandbox', () => {
  it('enrols the learner, who takes it at its provider', async () => {
    const { client } = await start();
    await buyCourse(client, LISTED_ID);
    const listed = (await catalogueOf(client, 'us')).courses.find((c) => c.id === LISTED_ID);
    expect(listed?.enrolment).toBe('active');
    const enrolment = await bodyOf(
      await client.get(`/api/learning/listed-courses/${LISTED_ID}`),
      200,
      listedEnrolmentSchema,
    );
    expect(enrolment).toMatchObject({
      courseId: LISTED_ID,
      provider: 'Microsoft Learn',
      url: findSellableCourse(LISTED_ID)?.url,
      status: 'active',
    });
    await expectProblem(await client.get(`/api/learning/courses/${LISTED_ID}`), 404, 'not_found');
  });

  it('is a 404 for a hosted course or one not bought, and a 401 without a session', async () => {
    const { server, client } = await start();
    await buyCourse(client, HOSTED_ID);
    await expectProblem(
      await client.get(`/api/learning/listed-courses/${HOSTED_ID}`),
      404,
      'not_found',
    );
    await expectProblem(
      await client.get(`/api/learning/listed-courses/${LISTED_ID}`),
      404,
      'not_found',
    );
    await expectProblem(
      await server.client().get(`/api/learning/listed-courses/${LISTED_ID}`),
      401,
      'no_session',
    );
  });
});
