import type { ExposureReport } from '@rewire/contracts';
import { describe, expect, it, vi } from 'vitest';

import { createApiClient } from '../src/api/client.ts';
import { ApiError, CLIENT_PROBLEM } from '../src/api/request.ts';

const report: ExposureReport = {
  isco08: '4313',
  title: 'Payroll Clerks',
  majorGroup: { code: '4', title: 'Clerical support workers' },
  meanScore: 0.61,
  standardDeviation: 0.08,
  gradient: 'gradient-4',
  tasks: [
    {
      id: '4313-5',
      text: 'Verifying attendance.',
      score: 0.7,
      band: 'medium',
      range: { low: 0.65, high: 0.75 },
      reviewedByExperts: false,
    },
  ],
  tasksByBand: { high: 0, medium: 1, low: 0, 'very-low': 0 },
  standing: { moreExposed: 7, outOf: 427 },
  personal: {
    score: 0.7,
    range: { low: 0.65, high: 0.75 },
    weekByBand: { high: 0, medium: 100, low: 0, 'very-low': 0 },
    tasksCounted: 1,
  },
};

function answer(status: number, body: unknown, type = 'application/json'): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': type } });
}

function clientWith(response: Response | Error) {
  const fetchFn = vi.fn<typeof fetch>(() =>
    response instanceof Error ? Promise.reject(response) : Promise.resolve(response),
  );
  return { fetchFn, api: createApiClient(fetchFn, '/api') };
}

async function problemOf(promise: Promise<unknown>) {
  const error: unknown = await promise.then(
    () => undefined,
    (reason: unknown) => reason,
  );
  expect(error).toBeInstanceOf(ApiError);
  // Checked just above with `toBeInstanceOf`.
  return (error as ApiError).problem;
}

describe('API client', () => {
  it('returns an answer that matches the contract', async () => {
    const { api, fetchFn } = clientWith(answer(200, report));
    await expect(api.report('4313')).resolves.toEqual(report);
    expect(fetchFn).toHaveBeenCalledWith('/api/unit-groups/4313', expect.anything());
  });

  it('requests and validates Spanish task translations by occupation', async () => {
    const translations = {
      language: 'es',
      translations: [{ id: '4313-5', text: 'Verificar la asistencia.' }],
    };
    const { api, fetchFn } = clientWith(answer(200, translations));
    await expect(api.taskTranslations('4313')).resolves.toEqual(translations);
    expect(fetchFn).toHaveBeenCalledWith(
      '/api/unit-groups/4313/task-translations?lang=es',
      expect.objectContaining({ signal: null }),
    );
    const invalid = clientWith(answer(200, { language: 'es', translations: [{ id: '4313-5' }] }));
    expect((await problemOf(invalid.api.taskTranslations('4313'))).code).toBe(
      CLIENT_PROBLEM.invalidAnswer,
    );
  });

  it('builds the search address with its query', async () => {
    const { api, fetchFn } = clientWith(answer(200, { query: 'payroll clerk', matches: [] }));
    await api.searchOccupations({ region: 'us', query: 'payroll clerk', limit: 6, language: 'en' });
    expect(fetchFn.mock.calls[0]?.[0]).toBe(
      '/api/regions/us/occupations?q=payroll+clerk&limit=6&lang=en',
    );
  });

  it('posts the time of each task as JSON', async () => {
    const { api, fetchFn } = clientWith(answer(200, report.personal));
    await api.personalExposure('4313', { timeByTask: { '4313-5': 'most' } });
    const init = fetchFn.mock.calls[0]?.[1];
    expect(init?.method).toBe('POST');
    expect(init?.body).toBe('{"timeByTask":{"4313-5":"most"}}');
  });

  it('turns a problem answer into an ApiError with its detail', async () => {
    const problem = {
      status: 404,
      code: 'not_found',
      title: 'Not found',
      detail: 'That task does not exist.',
    };
    const { api } = clientWith(answer(404, problem, 'application/problem+json'));
    await expect(problemOf(api.rationale('4313', 'x'))).resolves.toEqual(problem);
  });

  it('rejects an answer that breaks the contract', async () => {
    const { api } = clientWith(answer(200, { ...report, meanScore: 7 }));
    const problem = await problemOf(api.report('4313'));
    expect(problem.code).toBe(CLIENT_PROBLEM.invalidAnswer);
  });

  it('reports a network failure as such', async () => {
    const { api } = clientWith(new TypeError('Failed to fetch'));
    const problem = await problemOf(api.sources());
    expect(problem.code).toBe(CLIENT_PROBLEM.network);
  });

  it('lets an aborted request stay aborted', async () => {
    const { api } = clientWith(new DOMException('Aborted', 'AbortError'));
    await expect(api.unitGroups()).rejects.toMatchObject({ name: 'AbortError' });
  });

  it('asks for the labour figures of a group alone when there is no regional occupation', async () => {
    const { fetchFn, api } = clientWith(answer(200, { employment: null, pay: null }));
    await expect(api.labour('uk', null, '4313')).resolves.toEqual({ employment: null, pay: null });
    expect(fetchFn.mock.calls[0]?.[0]).toBe('/api/regions/uk/labour?isco08=4313');
  });
});
