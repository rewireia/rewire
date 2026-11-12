import type { EmploymentSeries, PaySeries } from '../../src/index.ts';
import { EUROSTAT_EARNINGS, EUROSTAT_EMPLOYMENT } from '../labour-sources.ts';
import { readJsonStat, type JsonStatObservation } from '../readers/json-stat.ts';

import { figuresByCode, requireRecords } from './labour-figures.ts';

/** Eurostat flags a figure of low reliability with `u`; it is left out, like a withheld one. */
const LOW_RELIABILITY = 'u';

const THOUSAND = 1000;

/** ISCO-08 groups as Eurostat codes them: `OC2` is major group 2, `OC25` sub-major group 25. */
const SUB_MAJOR_GROUP = /^OC(\d{2})$/;
const MAJOR_GROUP = /^OC(\d)$/;

/**
 * Turns the Eurostat table of employment by ISCO-08 sub-major group (in thousands) into EU
 * employment, in people.
 */
export function buildEuEmployment(json: unknown, minimumRecords: number): EmploymentSeries {
  const table = readJsonStat(json, 'isco08');
  requireFixed(table.fixed, { unit: 'THS_PER', age: 'Y_GE15', sex: 'T', geo: 'EU27_2020' });
  const groups = groupsAt(table.observations, SUB_MAJOR_GROUP);
  requireRecords('the Eurostat employment table', groups.length, minimumRecords);
  return {
    level: 'isco-2-digit',
    period: periodOf(table.fixed),
    source: EUROSTAT_EMPLOYMENT.id,
    population: 'People aged 15 and over in employment in the 27 countries of the EU',
    counts: 'people',
    byCode: figuresByCode(
      reliable(groups).map(({ code, value }) => [code, Math.round(value * THOUSAND)]),
    ),
    titles: titlesOf(groups),
  };
}

/** Turns the Eurostat table of mean monthly earnings by ISCO-08 major group into EU pay. */
export function buildEuPay(json: unknown, minimumRecords: number): PaySeries {
  const table = readJsonStat(json, 'isco08');
  requireFixed(table.fixed, { unit: 'EUR', indic_se: 'ERN', sex: 'T', geo: 'EU27_2020' });
  const groups = groupsAt(table.observations, MAJOR_GROUP);
  requireRecords('the Eurostat earnings table', groups.length, minimumRecords);
  return {
    level: 'isco-1-digit',
    period: periodOf(table.fixed),
    source: EUROSTAT_EARNINGS.id,
    population:
      'Employees of enterprises with 10 or more employees in industry, construction and ' +
      'services, except public administration and defence, in the 27 countries of the EU',
    currency: 'EUR',
    measure: 'mean-monthly',
    byCode: figuresByCode(reliable(groups).map(({ code, value }) => [code, Math.round(value)])),
    titles: titlesOf(groups),
  };
}

interface Group extends JsonStatObservation {
  /** The ISCO-08 code without Eurostat's prefix. */
  readonly code: string;
}

function groupsAt(observations: readonly JsonStatObservation[], level: RegExp): Group[] {
  return observations.flatMap((observation) => {
    const code = level.exec(observation.code)?.[1];
    return code === undefined ? [] : [{ ...observation, code }];
  });
}

function reliable(groups: readonly Group[]): { code: string; value: number }[] {
  return groups.flatMap(({ code, value, status }) =>
    value === undefined || status === LOW_RELIABILITY ? [] : [{ code, value }],
  );
}

function titlesOf(groups: readonly Group[]): Record<string, string> {
  return Object.fromEntries(groups.map(({ code, label }) => [code, label]));
}

/** The query fixes these dimensions; a response about anything else must not be read as this. */
function requireFixed(
  fixed: Readonly<Record<string, string>>,
  expected: Readonly<Record<string, string>>,
): void {
  for (const [dimension, code] of Object.entries(expected)) {
    if (fixed[dimension] !== code) {
      throw new Error(`the Eurostat response is for ${dimension} ${fixed[dimension]}, not ${code}`);
    }
  }
}

function periodOf(fixed: Readonly<Record<string, string>>): string {
  const period = fixed['time'];
  if (period === undefined || period === '') {
    throw new Error('the Eurostat response names no period');
  }
  return period;
}
