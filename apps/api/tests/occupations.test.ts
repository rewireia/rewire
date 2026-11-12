import {
  dataSourceListSchema,
  exposureReportSchema,
  occupationSearchResultSchema,
  personalExposureSchema,
  taskRationaleSchema,
  unitGroupListSchema,
} from '@rewire/contracts';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { bodyOf, type TestClient } from './support/client.ts';
import { createTestApi, expectProblem, type TestApi } from './support/test-api.ts';

let api: TestApi;
let visitor: TestClient;

beforeAll(async () => {
  api = await createTestApi();
  visitor = api.client();
});

afterAll(async () => {
  await api.close();
});

describe('occupation search', () => {
  it('finds the payroll clerk of the US and reads it as ISCO-08 4313', async () => {
    const result = await bodyOf(
      await visitor.get('/api/regions/us/occupations?q=payroll%20clerk'),
      200,
      occupationSearchResultSchema,
    );
    expect(result.query).toBe('payroll clerk');
    expect(result.matches[0]?.unitGroup).toMatchObject({ isco08: '4313', scored: true });
  });

  it('does not exist for an unknown region', async () => {
    await expectProblem(await visitor.get('/api/regions/xx/occupations?q=clerk'), 404, 'not_found');
  });

  it('needs at least two characters', async () => {
    await expectProblem(await visitor.get('/api/regions/us/occupations?q=a'), 400, 'invalid_input');
  });
});

describe('exposure', () => {
  it('lists every scored unit group', async () => {
    const list = await bodyOf(await visitor.get('/api/unit-groups'), 200, unitGroupListSchema);
    expect(list.unitGroups.length).toBeGreaterThan(400);
  });

  it('reports the five tasks of 4313, most exposed first, in the top gradient', async () => {
    const report = await bodyOf(
      await visitor.get('/api/unit-groups/4313'),
      200,
      exposureReportSchema,
    );
    expect(report.tasks).toHaveLength(5);
    expect(report.gradient).toBe('gradient-4');
    const scores = report.tasks.map((task) => task.score);
    expect(scores).toEqual(scores.toSorted((a, b) => b - a));
  });

  it('does not exist for a code the ILO has not scored', async () => {
    await expectProblem(await visitor.get('/api/unit-groups/0000'), 404, 'not_found');
  });

  it('weighs a person exposure by the time they give each task', async () => {
    const report = await bodyOf(
      await visitor.get('/api/unit-groups/4313'),
      200,
      exposureReportSchema,
    );
    const [top] = report.tasks;
    const personal = await bodyOf(
      await visitor.post('/api/unit-groups/4313/personal-exposure', {
        timeByTask: { [top?.id ?? '']: 'none' },
      }),
      200,
      personalExposureSchema,
    );
    expect(personal.tasksCounted).toBe(4);
    expect(personal.score).toBeLessThan(report.personal.score ?? 0);
  });

  it('refuses a task the occupation does not have', async () => {
    const problem = await expectProblem(
      await visitor.post('/api/unit-groups/4313/personal-exposure', {
        timeByTask: { '2512-1': 'most' },
      }),
      400,
      'invalid_input',
    );
    expect(problem.issues?.[0]?.path).toBe('timeByTask.2512-1');
  });

  it('gives the reasoning of the models behind a task score', async () => {
    const report = await bodyOf(
      await visitor.get('/api/unit-groups/4313'),
      200,
      exposureReportSchema,
    );
    const taskId = report.tasks[0]?.id ?? '';
    const rationale = await bodyOf(
      await visitor.get(`/api/unit-groups/4313/tasks/${taskId}/rationale`),
      200,
      taskRationaleSchema,
    );
    expect(rationale.taskId).toBe(taskId);
    expect(rationale.rationales.length).toBeGreaterThan(0);
    await expectProblem(
      await visitor.get('/api/unit-groups/4313/tasks/2512-1/rationale'),
      404,
      'not_found',
    );
  });
});

describe('sources', () => {
  it('lists the official sources with their licences', async () => {
    const list = await bodyOf(await visitor.get('/api/sources'), 200, dataSourceListSchema);
    expect(list.sources.length).toBeGreaterThan(0);
  });
});
