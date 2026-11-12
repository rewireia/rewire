import { occupationDetailSchema, occupationLabourSchema } from '@rewire/contracts';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { anyString, bodyOf, matching, type TestClient } from './support/client.ts';
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

const detailOf = async (path: string) =>
  bodyOf(await visitor.get(path), 200, occupationDetailSchema);
const labourOf = async (path: string) =>
  bodyOf(await visitor.get(path), 200, occupationLabourSchema);

describe('an occupation by its code', () => {
  it('is read through its own first link, with the other groups as alternatives', async () => {
    const detail = await detailOf('/api/regions/us/occupations/43-3051.00');
    expect(detail.occupation).toMatchObject({
      code: '43-3051.00',
      title: 'Payroll and Timekeeping Clerks',
    });
    expect(detail.unitGroup).toMatchObject({ isco08: '4313', basis: 'exact-match', scored: true });
    expect(detail.alternatives.map((link) => link.isco08)).toEqual(['3353', '4416']);
  });

  it('is read through the group of the job title the person arrived with', async () => {
    const detail = await detailOf('/api/regions/uk/occupations/8211?isco08=8332');
    expect(detail.unitGroup).toMatchObject({ isco08: '8332', basis: 'job-title' });
    expect(detail.alternatives.map((link) => link.isco08)).not.toContain('8332');
  });

  it('does not exist through a group it has nothing to do with', async () => {
    await expectProblem(
      await visitor.get('/api/regions/us/occupations/43-3051.00?isco08=2512'),
      404,
      'not_found',
    );
  });

  it('does not exist for a code the classification does not have', async () => {
    await expectProblem(
      await visitor.get('/api/regions/us/occupations/99-9999.99'),
      404,
      'not_found',
    );
  });

  it('refuses a group that is not four digits', async () => {
    await expectProblem(
      await visitor.get('/api/regions/us/occupations/43-3051.00?isco08=43'),
      400,
      'invalid_input',
    );
  });
});

describe('the labour market of an occupation', () => {
  it('gives the employment and median annual pay of a US occupation, with their source', async () => {
    const { employment, pay } = await labourOf('/api/regions/us/labour?code=43-3051.00');
    expect(employment).toMatchObject({
      value: 153140,
      level: 'regional-occupation',
      counts: 'jobs',
      source: { id: 'bls-oews', publisher: anyString },
    });
    expect(pay).toMatchObject({
      value: 58260,
      currency: 'USD',
      measure: 'median-annual',
      source: { id: 'bls-oews', url: matching(/^https:\/\//) },
    });
  });

  it('falls back to the wider ISCO groups in the EU, and says so', async () => {
    const { employment, pay } = await labourOf('/api/regions/eu/labour?code=2512.4&isco08=2512');
    expect(employment).toMatchObject({ level: 'isco-2-digit', groupCode: '25', counts: 'people' });
    expect(pay).toMatchObject({
      level: 'isco-1-digit',
      groupCode: '2',
      groupTitle: 'Professionals',
      currency: 'EUR',
      measure: 'mean-monthly',
    });
  });

  it('is null where no source publishes a figure', async () => {
    expect(await labourOf('/api/regions/eu/labour?code=2512.4')).toEqual({
      employment: null,
      pay: null,
    });
  });

  it('finds the figures published by group from the international group alone', async () => {
    const { employment, pay } = await labourOf('/api/regions/eu/labour?isco08=2512');
    expect(employment).toMatchObject({ level: 'isco-2-digit', groupCode: '25' });
    expect(pay).toMatchObject({ level: 'isco-1-digit', groupCode: '2' });
  });

  it('has no figure by occupation when only the international group is known', async () => {
    expect(await labourOf('/api/regions/us/labour?isco08=4313')).toEqual({
      employment: null,
      pay: null,
    });
  });

  it('needs the code of the occupation or its international group', async () => {
    await expectProblem(await visitor.get('/api/regions/us/labour'), 400, 'invalid_input');
  });
});
