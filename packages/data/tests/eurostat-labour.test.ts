import { describe, expect, it } from 'vitest';

import { buildEuEmployment, buildEuPay } from '../pipeline/steps/eurostat-labour.ts';

/** A Eurostat response along `isco08`, with the given dimensions fixed. */
function answer(
  fixed: Readonly<Record<string, string>>,
  groups: readonly (readonly [code: string, value: number | undefined, status?: string])[],
): unknown {
  const ids = [...Object.keys(fixed), 'isco08'];
  const value: Record<string, number> = {};
  const status: Record<string, string> = {};
  groups.forEach(([, figure, flag], position) => {
    if (figure !== undefined) {
      value[String(position)] = figure;
    }
    if (flag !== undefined) {
      status[String(position)] = flag;
    }
  });
  return {
    id: ids,
    size: ids.map((id) => (id === 'isco08' ? groups.length : 1)),
    value,
    status,
    dimension: {
      ...Object.fromEntries(
        Object.entries(fixed).map(([id, code]) => [id, { category: { index: [code] } }]),
      ),
      isco08: {
        category: {
          index: groups.map(([code]) => code),
          label: Object.fromEntries(groups.map(([code]) => [code, `Group ${code}`])),
        },
      },
    },
  };
}

const LFS = { unit: 'THS_PER', age: 'Y_GE15', sex: 'T', geo: 'EU27_2020', time: '2025' };
const SES = { unit: 'EUR', indic_se: 'ERN', sex: 'T', geo: 'EU27_2020', time: '2022' };

describe('buildEuEmployment', () => {
  const lfs = answer(LFS, [
    ['TOTAL', 207172.7],
    ['OC2', 48651.8],
    ['OC25', 5488.2],
    ['OC63', 13.3, 'u'],
    ['OC01', undefined],
    ['NRP', 400],
  ]);

  it('keeps the sub-major groups, in people, without Eurostat’s prefix', () => {
    const employment = buildEuEmployment(lfs, 3);

    expect(employment.byCode).toEqual({ '25': 5488200 });
    expect(employment).toMatchObject({ level: 'isco-2-digit', period: '2025', counts: 'people' });
  });

  it('leaves out a figure flagged as unreliable or missing, but keeps every title', () => {
    const employment = buildEuEmployment(lfs, 3);

    expect(employment.byCode).not.toHaveProperty('63');
    expect(employment.titles).toEqual({
      '01': 'Group OC01',
      '25': 'Group OC25',
      '63': 'Group OC63',
    });
  });

  it('fails on a response for another unit or with too few groups', () => {
    expect(() => buildEuEmployment(answer({ ...LFS, unit: 'PC' }, [['OC25', 1]]), 1)).toThrow(
      'the Eurostat response is for unit PC, not THS_PER',
    );
    expect(() => buildEuEmployment(lfs, 43)).toThrow('holds 3 records; at least 43');
  });
});

describe('buildEuPay', () => {
  it('keeps the rounded mean monthly earnings of the major groups', () => {
    const pay = buildEuPay(
      answer(SES, [
        ['TOTAL', 2868],
        ['OC1-5', 3204],
        ['OC2', 3850.4],
        ['OC0', 3678, 'e'],
      ]),
      2,
    );

    expect(pay.byCode).toEqual({ '0': 3678, '2': 3850 });
    expect(pay).toMatchObject({
      level: 'isco-1-digit',
      period: '2022',
      currency: 'EUR',
      measure: 'mean-monthly',
      source: 'eurostat-earn-ses22-48',
    });
  });

  it('fails on a response in another currency', () => {
    expect(() => buildEuPay(answer({ ...SES, unit: 'PPS' }, [['OC2', 1]]), 1)).toThrow(
      'the Eurostat response is for unit PPS, not EUR',
    );
  });
});
