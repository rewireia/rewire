import { describe, expect, it } from 'vitest';

import type { SheetRecord } from '../pipeline/readers/spreadsheet.ts';
import { buildUkClassification } from '../pipeline/steps/ons-classification.ts';

const PROGRAMMERS = '2134';

const FRAMEWORK: SheetRecord[] = [
  { 'SOC2020 Unit Group': null, 'SOC2020 Group Title': 'PROFESSIONAL OCCUPATIONS' },
  { 'SOC2020 Unit Group': '213', 'SOC2020 Group Title': 'Information technology professionals' },
  {
    'SOC2020 Unit Group': PROGRAMMERS,
    'SOC2020 Group Title': 'Programmers and  software development professionals',
  },
  { 'SOC2020 Unit Group': 8211, 'SOC2020 Group Title': 'Large goods vehicle drivers' },
];

/** One entry of the coding index, coded to the programmers unit group unless overridden. */
function indexRow(
  text: string | null,
  isco08: string | null,
  overrides: Partial<Record<'SOC_2020' | 'ADD' | 'IND', string | number | null>> = {},
): SheetRecord {
  return {
    SOC_2020: PROGRAMMERS,
    ADD: null,
    IND: null,
    'ISCO-08 code based on SOC2020': isco08,
    'INDEXOCC_-_natural_word_order': text,
    ...overrides,
  };
}

function ukOccupation(index: readonly SheetRecord[], code = PROGRAMMERS) {
  const classification = buildUkClassification({ index, framework: FRAMEWORK });
  return classification.occupations.find((occupation) => occupation.code === code);
}

describe('buildUkClassification', () => {
  it('turns only the unit-group lines of the framework into occupations', () => {
    const classification = buildUkClassification({ index: [], framework: FRAMEWORK });

    expect(classification.occupations.map(({ code, title }) => [code, title])).toEqual([
      [PROGRAMMERS, 'Programmers and software development professionals'],
      ['8211', 'Large goods vehicle drivers'],
    ]);
  });

  it('gives each job title the ISCO-08 code the index assigns to it', () => {
    const occupation = ukOccupation([
      indexRow('Software developer', '2512'),
      indexRow('Web developer', '2513'),
    ]);

    expect(occupation?.titles).toEqual([
      { text: 'Software developer', language: 'en', isco08: '2512' },
      { text: 'Web developer', language: 'en', isco08: '2513' },
    ]);
  });

  it('keeps a title whose ISCO-08 cell is not a unit group, without a code', () => {
    const occupation = ukOccupation([indexRow('Programmer', null), indexRow('Coder', '25')]);

    expect(occupation?.titles).toEqual([
      { text: 'Programmer', language: 'en' },
      { text: 'Coder', language: 'en' },
    ]);
  });

  it('joins the ADD and IND columns into the qualifier of a title', () => {
    const occupation = ukOccupation([
      indexRow('Engineer', '2512', { ADD: 'software', IND: 'telecommunications' }),
      indexRow('Analyst', '2512', { ADD: 'software' }),
      indexRow('Consultant', '2512', { IND: 'computer services' }),
    ]);

    expect(occupation?.titles.map((title) => title.qualifier)).toEqual([
      'software, telecommunications',
      'software',
      'computer services',
    ]);
  });

  it('drops index entries that cannot be coded or have no title', () => {
    const occupation = ukOccupation([
      indexRow('Software developer', '2512'),
      indexRow('Developer', null, { SOC_2020: '}}}}' }),
      indexRow(null, '2512'),
    ]);

    expect(occupation?.titles.map((title) => title.text)).toEqual(['Software developer']);
  });

  it('files each title under its own SOC 2020 unit group, given as text or number', () => {
    const drivers = ukOccupation(
      [indexRow('HGV driver', '8332', { SOC_2020: 8211 }), indexRow('Software developer', '2512')],
      '8211',
    );

    expect(drivers?.titles.map((title) => title.text)).toEqual(['HGV driver']);
  });

  it('restores the leading zeros of an ISCO-08 code stored as a number', () => {
    const numeric = { ...indexRow('Soldier', null), 'ISCO-08 code based on SOC2020': 110 };

    expect(ukOccupation([numeric])?.titles).toEqual([
      { text: 'Soldier', language: 'en', isco08: '0110' },
    ]);
  });

  it('links the unit group to the codes of its titles, most frequent first', () => {
    const occupation = ukOccupation([
      indexRow('Web designer', '2166'),
      indexRow('Software developer', '2512'),
      indexRow('Web developer', '2513'),
      indexRow('Programmer', '2512'),
    ]);

    expect(occupation?.iscoLinks).toEqual([
      { isco08: '2512', basis: 'title-majority', support: 2 },
      { isco08: '2166', basis: 'title-majority', support: 1 },
      { isco08: '2513', basis: 'title-majority', support: 1 },
    ]);
  });

  it('counts a title that the index repeats only once in the majority', () => {
    const occupation = ukOccupation([
      indexRow('Web developer', '2513'),
      indexRow('Web developer', '2513'),
      indexRow('Software developer', '2512'),
    ]);

    expect(occupation?.iscoLinks.map((link) => [link.isco08, link.support])).toEqual([
      ['2512', 1],
      ['2513', 1],
    ]);
  });

  it('leaves a unit group without coded titles with no link', () => {
    expect(ukOccupation([indexRow('Programmer', null)])?.iscoLinks).toEqual([]);
  });
});
