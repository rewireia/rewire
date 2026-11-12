import { describe, expect, it } from 'vitest';

import { buildTitleIndex, searchOccupations, type TitleIndex } from '../src/index.ts';
import { prefixCompletionsOf } from '../src/occupation/search.ts';

import { classification, jobTitle, occupation } from './support/builders.ts';

const PAYROLL = '43-3051.00';
const NURSES = '29-1141.00';

const US = buildTitleIndex(
  classification('us', [
    occupation(
      PAYROLL,
      'Payroll and Timekeeping Clerks',
      ['4313'],
      ['Payroll Clerk', 'Timekeeper'],
    ),
    occupation(
      '43-3031.00',
      'Bookkeeping, Accounting, and Auditing Clerks',
      ['4311'],
      ['Accounting Clerk', 'Bookkeeper'],
    ),
    occupation(
      '15-1252.00',
      'Software Developers',
      ['2512'],
      ['Software Engineer', 'Application Developer'],
    ),
    occupation('13-2011.00', 'Accountants and Auditors', ['2411'], ['Accountant']),
    occupation(NURSES, 'Registered Nurses', ['2221'], ['Registered Nurse', 'Staff Nurse']),
  ]),
);

const UK = buildTitleIndex(
  classification('uk', [
    occupation(
      '2134',
      'Programmers and software development professionals',
      ['2512'],
      [
        jobTitle('Software developer', { isco08: '2512' }),
        jobTitle('Web developer', { isco08: '2513' }),
      ],
    ),
    occupation(
      '8119',
      'Process operatives not elsewhere classified',
      ['8189'],
      [jobTitle('Developer', { qualifier: 'photographic processing', isco08: '8132' })],
    ),
  ]),
);

const PREFIX_QUERIES = ['payr', 'payro', 'payrol', 'accou', 'bookk', 'software dev', 'nur'];

function search(index: TitleIndex, query: string, preferredLanguages?: readonly string[]) {
  return searchOccupations(index, query, preferredLanguages ? { preferredLanguages } : {});
}

function rarity(index: TitleIndex, ...words: string[]): number[] {
  return words.map((word) => index.rarity.get(word) ?? Number.NaN);
}

/** Every word of the index, every pair of them and every word followed by its own beginning. */
function queriesFrom(index: TitleIndex): string[] {
  const words = index.vocabulary;
  return [
    ...words,
    ...words.flatMap((first) => words.map((second) => `${first} ${second}`)),
    ...words.map((word) => `${word} ${word.slice(0, 3)}`),
  ];
}

describe('searchOccupations', () => {
  it('scores 1 a title that says exactly what the person wrote, however it is written', () => {
    for (const query of ['Payroll Clerk', 'PAYROLL CLERKS', 'payroll-clerk', 'clerk, payroll']) {
      const [first] = search(US, query);
      expect(first?.occupation.code, query).toBe(PAYROLL);
      expect(first?.score, query).toBeCloseTo(1);
      expect(first?.strength, query).toBe('exact');
    }
  });

  it('reports the title that matched and the unit group it leads to', () => {
    const [first] = search(US, 'payroll clerk');

    expect(first?.matchedTitle).toEqual({
      text: 'Payroll Clerk',
      language: 'en',
      qualifier: undefined,
      official: false,
    });
    expect(first?.unitGroup).toEqual({ isco08: '4313', basis: 'classification', alternatives: [] });
  });

  it('completes the word still being typed, at less than a full match', () => {
    for (const query of PREFIX_QUERIES) {
      const results = search(US, query);
      expect(results.length, query).toBeGreaterThan(0);
      for (const result of results) {
        expect(result.score, query).toBeLessThan(1);
        expect(result.strength, query).not.toBe('exact');
      }
    }
    expect(search(US, 'payro')[0]?.occupation.code).toBe(PAYROLL);
  });

  it('never scores above 1 when the word being typed completes a word already written', () => {
    for (const query of ['bookkeeper bookk', 'accountant accou', 'timekeeper time']) {
      for (const result of search(US, query)) {
        expect(result.score, `${query} → ${result.matchedTitle.text}`).toBeLessThanOrEqual(1);
      }
    }
  });

  it('scores a query that repeats the start of a written word below the word alone', () => {
    const [alone] = search(US, 'accountant');
    const [repeated] = search(US, 'accountant accou');

    expect(alone?.score).toBeCloseTo(1);
    expect(repeated?.occupation.code).toBe(alone?.occupation.code);
    expect(repeated?.score).toBeLessThan(alone?.score ?? 0);
  });

  it('scores every match from 0 to 1, whatever the query', () => {
    for (const index of [US, UK]) {
      for (const query of queriesFrom(index)) {
        for (const result of search(index, query)) {
          expect(result.score, query).toBeGreaterThanOrEqual(0);
          expect(result.score, query).toBeLessThanOrEqual(1);
        }
      }
    }
  });

  it('counts an unmentioned qualifier against the match at half its weight', () => {
    const photographic = search(UK, 'developer').find(
      (result) => result.occupation.code === '8119',
    );
    const [developer = 0, photo = 0, processing = 0] = rarity(
      UK,
      'developer',
      'photographic',
      'processing',
    );

    expect(photographic?.score).toBeCloseTo(
      (2 * developer) / (2 * developer + 0.5 * (photo + processing)),
    );
  });

  it('counts a mentioned qualifier word in full', () => {
    const [developer = 0, photo = 0, processing = 0] = rarity(
      UK,
      'developer',
      'photographic',
      'processing',
    );
    const [partly] = search(UK, 'photographic developer');
    const [fully] = search(UK, 'developer photographic processing');

    expect(partly?.occupation.code).toBe('8119');
    expect(partly?.score).toBeCloseTo(
      (2 * (developer + photo)) / (2 * (developer + photo) + 0.5 * processing),
    );
    expect(fully?.score).toBeCloseTo(1);
  });

  it('returns one result per occupation and unit group, with its best title', () => {
    const nurses = search(US, 'nurse').filter((result) => result.occupation.code === NURSES);
    const developers = search(UK, 'developer').filter(
      (result) => result.occupation.code === '2134',
    );

    expect(nurses).toHaveLength(1);
    expect(developers.map((result) => result.unitGroup?.isco08).toSorted()).toEqual([
      '2512',
      '2513',
    ]);
  });

  it('puts first, among equal scores, the occupation whose official title is closest', () => {
    const index = buildTitleIndex(
      classification('us', [
        occupation('43-3031.00', 'Accounting Clerks', ['4311'], ['Bookkeeper']),
        occupation('43-3099.00', 'Bookkeepers', ['4311']),
      ]),
    );

    const results = search(index, 'bookkeeper');

    expect(results.map((result) => result.score)).toEqual([1, 1]);
    expect(results.map((result) => result.occupation.code)).toEqual(['43-3099.00', '43-3031.00']);
  });

  it('puts first, among equal matches, a title in a language the person reads', () => {
    const index = buildTitleIndex(
      classification('eu', [
        occupation(
          '1211.3',
          'financial manager',
          ['1211'],
          [jobTitle('Controller', { language: 'de' })],
        ),
        occupation('4322.1', 'production planner', ['4322'], ['Controller']),
      ]),
    );
    const codesFor = (languages: readonly string[]) =>
      search(index, 'controller', languages).map((result) => result.occupation.code);

    expect(codesFor(['de'])).toEqual(['1211.3', '4322.1']);
    expect(codesFor(['en', 'de'])).toEqual(['4322.1', '1211.3']);
  });

  it('shows, among equal titles of one occupation, the official one first', () => {
    const index = buildTitleIndex(
      classification('eu', [
        occupation('2411.1', 'Controller', ['2411'], [jobTitle('Controller', { language: 'de' })]),
      ]),
    );

    expect(search(index, 'controller', ['de'])[0]?.matchedTitle).toMatchObject({
      language: 'en',
      official: true,
    });
  });

  it('shows, among equal titles of one occupation, the one in the best preferred language', () => {
    const index = buildTitleIndex(
      classification('eu', [
        occupation(
          '1211.3',
          'financial manager',
          ['1211'],
          ['fr', 'de', 'it'].map((language) => jobTitle('Controller', { language })),
        ),
      ]),
    );
    const languageFor = (languages: readonly string[]) =>
      search(index, 'controller', languages)[0]?.matchedTitle.language;

    expect(languageFor(['de'])).toBe('de');
    expect(languageFor(['it', 'de'])).toBe('it');
    expect(languageFor([])).toBe('fr');
  });

  it('shows, among equal titles of one occupation and language, the shorter one', () => {
    const index = buildTitleIndex(
      classification('us', [
        occupation(PAYROLL, 'Timekeeping Clerks', ['4313'], ['Clerks, payroll', 'Payroll clerk']),
      ]),
    );

    expect(search(index, 'payroll clerk')[0]?.matchedTitle.text).toBe('Payroll clerk');
  });

  it('orders the results from the highest score and leaves out weak ones', () => {
    for (const query of [
      'clerk',
      'accounting clerk',
      'software',
      'registered',
      ...PREFIX_QUERIES,
    ]) {
      const scores = search(US, query).map((result) => result.score);
      expect(scores, query).toEqual(scores.toSorted((a, b) => b - a));
      expect(Math.min(...scores), query).toBeGreaterThanOrEqual(0.3);
    }
  });

  it('returns at most the number of results asked for', () => {
    expect(searchOccupations(US, 'clerk', { limit: 1 })).toHaveLength(1);
  });

  it('finds nothing for an empty query or one made only of stop words', () => {
    for (const query of ['', '   ', 'the of', '—']) {
      expect(search(US, query), query).toEqual([]);
    }
  });

  it('finds nothing for an unknown word, and counts it against a known one', () => {
    expect(search(US, 'zzyzx')).toEqual([]);

    const [first] = search(US, 'payroll zzyzx clerk');
    expect(first?.occupation.code).toBe(PAYROLL);
    expect(first?.score).toBeLessThan(1);
  });
});

describe('prefixCompletionsOf', () => {
  /** More rare words than are kept, all sorting before "consultant", which two titles share. */
  const RARE_WORDS = Array.from({ length: 51 }, (_, at) => `Cona${String(at).padStart(2, '0')}`);
  const CROWDED = buildTitleIndex(
    classification('us', [
      occupation('13-1111.00', 'Management Analysts', ['2421'], [...RARE_WORDS, 'Consultant']),
      occupation('15-1211.00', 'Computer Systems Analysts', ['2511'], ['IT Consultant']),
    ]),
  );

  it('keeps the words in most titles when more words begin with the prefix than are kept', () => {
    const completions = prefixCompletionsOf(CROWDED, 'con');

    expect(completions).toHaveLength(50);
    expect(completions[0]).toBe('consultant');
  });

  it('orders equally common words as they sort', () => {
    expect(prefixCompletionsOf(CROWDED, 'con').slice(1, 4)).toEqual(['cona00', 'cona01', 'cona02']);
  });
});
