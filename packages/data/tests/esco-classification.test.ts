import { describe, expect, it } from 'vitest';

import { buildEuClassification } from '../pipeline/steps/esco-classification.ts';

const OCCUPATION_URI = 'http://data.europa.eu/esco/occupation';

const SOFTWARE_DEVELOPER = {
  uri: `${OCCUPATION_URI}/software-developer`,
  code: '2512.4',
  preferredLabel: {
    en: 'software developer',
    es: 'desarrollador de software/desarrolladora de software',
    de: 'Softwareentwickler/Softwareentwicklerin',
    fr: 'développeur de logiciels/développeuse de logiciels',
    it: 'sviluppatore software/sviluppatrice software',
    pt: 'programador de software',
  },
  alternativeLabel: {
    en: ['software engineer', '  application   programmer '],
    es: ['programador'],
    pt: ['engenheiro de software'],
  },
  description: { en: { literal: 'Software developers  implement or program software.' } },
};

const ACCOUNTANT = {
  uri: `${OCCUPATION_URI}/accountant`,
  code: '2411.1',
  preferredLabel: { en: 'accountant', fr: 'comptable', it: 'contabile' },
};

/** The pages the ESCO API would serve for these occupations, one per page. */
function escoPages(occupations: readonly object[], announced = occupations.length): unknown[] {
  return occupations.map((occupation) => ({
    total: announced,
    _embedded: { results: [occupation] },
  }));
}

/** Builds the classification from these occupations, expecting exactly as many. */
function euClassification(occupations: readonly object[]) {
  return buildEuClassification(escoPages(occupations), occupations.length);
}

function euOccupation(code: string) {
  const { classification } = euClassification([SOFTWARE_DEVELOPER, ACCOUNTANT]);
  const occupation = classification.occupations.find((candidate) => candidate.code === code);
  if (occupation === undefined) {
    throw new Error(`no occupation ${code}`);
  }
  return occupation;
}

describe('buildEuClassification', () => {
  it('takes the official title and the description from the English labels', () => {
    const occupation = euOccupation('2512.4');

    expect(occupation.title).toBe('software developer');
    expect(occupation.description).toBe('Software developers implement or program software.');
  });

  it('keeps the other English names but not the English official title', () => {
    const english = euOccupation('2512.4').titles.filter((title) => title.language === 'en');

    expect(english.map((title) => title.text)).toEqual([
      'software engineer',
      'application programmer',
    ]);
  });

  it('keeps titles only in English, Spanish, German, French and Italian', () => {
    const languages = new Set(euOccupation('2512.4').titles.map((title) => title.language));

    expect([...languages].toSorted()).toEqual(['de', 'en', 'es', 'fr', 'it']);
  });

  it('splits the gendered forms that a preferred label joins with a slash', () => {
    const spanish = euOccupation('2512.4').titles.filter((title) => title.language === 'es');

    expect(spanish.map((title) => title.text)).toEqual([
      'desarrollador de software',
      'desarrolladora de software',
      'programador',
    ]);
  });

  it('links each occupation to the unit group its code begins with', () => {
    expect(euOccupation('2411.1').iscoLinks).toEqual([
      { isco08: '2411', basis: 'classification', support: 1 },
    ]);
  });

  it('maps every occupation URI to its unit group', () => {
    const { iscoByUri } = euClassification([SOFTWARE_DEVELOPER, ACCOUNTANT]);

    expect(iscoByUri.size).toBe(2);
    expect(iscoByUri.get(SOFTWARE_DEVELOPER.uri)).toBe('2512');
    expect(iscoByUri.get(ACCOUNTANT.uri)).toBe('2411');
  });

  it('orders the occupations by code', () => {
    const { classification } = euClassification([SOFTWARE_DEVELOPER, ACCOUNTANT]);
    const codes = classification.occupations.map((occupation) => occupation.code);

    expect(codes).toEqual(['2411.1', '2512.4']);
    expect(classification.region).toBe('eu');
  });

  it('fails when an occupation has no English title', () => {
    const untitled = { ...ACCOUNTANT, preferredLabel: { fr: 'comptable' } };

    expect(() => euClassification([untitled])).toThrow(/has no English title/);
  });

  it('fails when the pages hold fewer occupations than they announce', () => {
    const pages = escoPages([SOFTWARE_DEVELOPER], 2);

    expect(() => buildEuClassification(pages, 2)).toThrow(
      'ESCO returned 1 occupations and announces 2; 2 were expected',
    );
  });

  it('fails when the announced total is not the one the source was pinned to', () => {
    const pages = escoPages([SOFTWARE_DEVELOPER, ACCOUNTANT]);

    expect(() => buildEuClassification(pages, 3)).toThrow('announces 2; 3 were expected');
  });

  it('fails when there are no pages at all', () => {
    expect(() => buildEuClassification([], 3)).toThrow('ESCO returned 0 occupations');
  });
});
