import { LIBRARY_READINGS, type ReadingContent } from '@rewire/content';
import { librarySchema } from '@rewire/contracts';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { libraryIn } from '../src/modules/library/present.ts';
import { libraryRoutes } from '../src/modules/library/routes.ts';

import { bodyOf, type TestClient } from './support/client.ts';
import { createTestApi, expectProblem, type TestApi } from './support/test-api.ts';

/** A reading made up for these tests only. */
const READING: ReadingContent = {
  id: 'test-reading',
  type: 'report',
  level: 'advanced',
  topic: 'policy',
  scope: 'eu',
  title: 'A test report',
  source: 'Test publisher',
  year: 2025,
  url: 'https://publisher.example/report.pdf',
  format: 'pdf',
  language: 'en',
  minutes: 40,
  why: { en: 'It sets out the rules.', es: 'Explica las normas.' },
  checkedOn: '2026-11-12',
};

let api: TestApi;
let visitor: TestClient;

beforeEach(async () => {
  api = await createTestApi();
  visitor = api.client();
});

afterEach(async () => {
  await api.close();
});

describe('GET /api/library', () => {
  it('serves every reading of the library in the contract, in English by default', async () => {
    const response = await visitor.get('/api/library');
    const { readings } = await bodyOf(response, 200, librarySchema);
    expect(readings.map(({ id }) => id)).toEqual(LIBRARY_READINGS.map(({ id }) => id));
    expect(readings.map(({ why }) => why)).toEqual(LIBRARY_READINGS.map(({ why }) => why.en));
  });

  it('may be kept by a browser and a shared cache', async () => {
    const response = await visitor.get('/api/library?language=es');
    expect(response.headers.get('Cache-Control')).toBe('public, max-age=86400');
    await bodyOf(response, 200, librarySchema);
  });

  it('refuses a language it does not speak', async () => {
    await expectProblem(await visitor.get('/api/library?language=fr'), 400, 'invalid_input');
  });
});

describe('the library in a language', () => {
  it('gives each reading its reason in that language and keeps everything else', async () => {
    const response = await libraryRoutes([READING]).request('/library?language=es');
    const { readings } = await bodyOf(response, 200, librarySchema);
    expect(readings).toEqual([{ ...READING, why: 'Explica las normas.' }]);
    expect(libraryIn([READING], 'en').readings[0]?.why).toBe('It sets out the rules.');
  });
});
