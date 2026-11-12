import { describe, expect, it } from 'vitest';

import type { CsvRecord } from '../pipeline/readers/csv.ts';
import {
  buildUsClassification,
  type OnetStepInput,
} from '../pipeline/steps/onet-classification.ts';

const ESCO = 'http://data.europa.eu/esco';
const SOFTWARE_DEVELOPERS = '15-1252.00';

/** ESCO occupations the crosswalk rows below point at, with their unit groups. */
const ISCO_BY_ESCO_URI = new Map([
  [`${ESCO}/occupation/ict-systems-analyst`, '2511'],
  [`${ESCO}/occupation/software-developer`, '2512'],
  [`${ESCO}/occupation/web-developer`, '2513'],
]);

function crosswalkRow(target: string, match: string, onetId = SOFTWARE_DEVELOPERS): CsvRecord {
  const uri = target.includes('/') ? target : `${ESCO}/occupation/${target}`;
  return { 'O*NET Id': onetId, 'ESCO or ISCO URI': uri, 'Type of Match': match };
}

function usClassification(input: Partial<OnetStepInput> = {}) {
  return buildUsClassification({
    occupations: [
      {
        'O*NET-SOC Code': SOFTWARE_DEVELOPERS,
        Title: 'Software Developers',
        Description: ' Research, design, and develop  computer applications. ',
      },
      {
        'O*NET-SOC Code': '13-2011.00',
        Title: 'Accountants and Auditors',
        Description: 'Examine, analyze, and interpret accounting records.',
      },
    ],
    jobTitles: [],
    crosswalk: [],
    iscoByEscoUri: ISCO_BY_ESCO_URI,
    ...input,
  });
}

/** The links of Software Developers given these crosswalk rows. */
function linksOf(crosswalk: readonly CsvRecord[]) {
  const { classification } = usClassification({ crosswalk });
  return classification.occupations.find((occupation) => occupation.code === SOFTWARE_DEVELOPERS)
    ?.iscoLinks;
}

describe('buildUsClassification', () => {
  it('orders links by the strongest relation first, whatever their support', () => {
    const links = linksOf([
      crosswalkRow('ict-systems-analyst', 'broadMatch'),
      crosswalkRow('ict-systems-analyst', 'broadMatch'),
      crosswalkRow('web-developer', 'narrowMatch'),
      crosswalkRow('software-developer', 'closeMatch'),
    ]);

    expect(links?.map((link) => [link.isco08, link.basis])).toEqual([
      ['2512', 'close-match'],
      ['2513', 'narrow-match'],
      ['2511', 'broad-match'],
    ]);
  });

  it('orders links of the same relation by the number of crosswalk rows behind them', () => {
    const links = linksOf([
      crosswalkRow('ict-systems-analyst', 'closeMatch'),
      crosswalkRow('web-developer', 'closeMatch'),
      crosswalkRow('web-developer', 'closeMatch'),
    ]);

    expect(links?.map((link) => [link.isco08, link.support])).toEqual([
      ['2513', 2],
      ['2511', 1],
    ]);
  });

  it('orders links of the same relation and support by the lowest code', () => {
    const links = linksOf([
      crosswalkRow('web-developer', 'exactMatch'),
      crosswalkRow('ict-systems-analyst', 'exactMatch'),
    ]);

    expect(links?.map((link) => link.isco08)).toEqual(['2511', '2513']);
  });

  it('merges rows that reach the same unit group, keeping the strongest relation', () => {
    const links = linksOf([
      crosswalkRow('software-developer', 'narrowMatch'),
      crosswalkRow('software-developer', 'exactMatch'),
      crosswalkRow('software-developer', 'broadMatch'),
    ]);

    expect(links).toEqual([{ isco08: '2512', basis: 'exact-match', support: 3 }]);
  });

  it('treats an exact match to an ISCO group as an exact match', () => {
    const links = linksOf([crosswalkRow(`${ESCO}/isco/C2512`, 'exactISCO')]);

    expect(links).toEqual([{ isco08: '2512', basis: 'exact-match', support: 1 }]);
  });

  it('links a four-digit ISCO group URI and counts a broader one as unresolved', () => {
    const { classification, unresolvedCrosswalkRows } = usClassification({
      crosswalk: [
        crosswalkRow(`${ESCO}/isco/C2512`, 'closeMatch'),
        crosswalkRow(`${ESCO}/isco/C251`, 'broadMatch'),
      ],
    });

    expect(classification.occupations[1]?.iscoLinks.map((link) => link.isco08)).toEqual(['2512']);
    expect(unresolvedCrosswalkRows).toBe(1);
  });

  it('counts the rows that point at an ESCO occupation outside the known ones', () => {
    const { unresolvedCrosswalkRows } = usClassification({
      crosswalk: [
        crosswalkRow('software-developer', 'exactMatch'),
        crosswalkRow('retired-occupation', 'closeMatch'),
        crosswalkRow('another-retired-occupation', 'closeMatch', '13-2011.00'),
      ],
    });

    expect(unresolvedCrosswalkRows).toBe(2);
  });

  it('counts apart the rows whose O*NET-SOC code is not an O*NET occupation', () => {
    const { unresolvedCrosswalkRows, orphanCrosswalkRows } = usClassification({
      crosswalk: [
        crosswalkRow('software-developer', 'exactMatch'),
        crosswalkRow('software-developer', 'closeMatch', '15-1299.99'),
        crosswalkRow('retired-occupation', 'closeMatch', '15-1299.99'),
        crosswalkRow('retired-occupation', 'closeMatch'),
      ],
    });

    expect(orphanCrosswalkRows).toBe(2);
    expect(unresolvedCrosswalkRows).toBe(1);
  });

  it('leaves an occupation without crosswalk rows with no link', () => {
    const { classification } = usClassification();

    expect(
      classification.occupations.every((occupation) => occupation.iscoLinks.length === 0),
    ).toBe(true);
  });

  it('keeps distinct, cleaned English job titles of each occupation', () => {
    const { classification } = usClassification({
      jobTitles: [
        { 'O*NET-SOC Code': SOFTWARE_DEVELOPERS, 'Job Title': ' Application  Developer ' },
        { 'O*NET-SOC Code': SOFTWARE_DEVELOPERS, 'Job Title': 'application developer' },
        { 'O*NET-SOC Code': '13-2011.00', 'Job Title': 'Accountant' },
      ],
    });

    expect(classification.occupations.map((occupation) => occupation.titles)).toEqual([
      [{ text: 'Accountant', language: 'en' }],
      [{ text: 'Application Developer', language: 'en' }],
    ]);
  });

  it('orders the occupations by code and cleans their texts', () => {
    const { classification } = usClassification();

    expect(classification.occupations.map((occupation) => occupation.code)).toEqual([
      '13-2011.00',
      SOFTWARE_DEVELOPERS,
    ]);
    expect(classification.occupations[1]?.description).toBe(
      'Research, design, and develop computer applications.',
    );
  });

  it('leaves out the description of an occupation O*NET does not describe', () => {
    const { classification } = usClassification({
      occupations: [
        { 'O*NET-SOC Code': SOFTWARE_DEVELOPERS, Title: 'Software Developers', Description: ' ' },
      ],
    });

    expect(classification.occupations[0]).not.toHaveProperty('description');
  });

  it('rejects a crosswalk row with an unknown type of match', () => {
    expect(() => linksOf([crosswalkRow('software-developer', 'relatedMatch')])).toThrow();
  });
});
