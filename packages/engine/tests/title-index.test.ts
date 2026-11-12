import { describe, expect, it } from 'vitest';

import { buildTitleIndex } from '../src/index.ts';

import { classification, jobTitle, occupation } from './support/builders.ts';

const PAYROLL = occupation(
  '43-3051.00',
  'Payroll and Timekeeping Clerks',
  ['4313'],
  ['Payroll Clerk', jobTitle('Gehaltsbuchhalter', { language: 'de' }), 'of the'],
);
const ACCOUNTING = occupation(
  '43-3031.00',
  'Accounting Clerks',
  ['4311'],
  [jobTitle('Clerk', { qualifier: 'ledger posting', isco08: '4311' })],
);
const INDEX = buildTitleIndex(classification('us', [PAYROLL, ACCOUNTING]));

describe('buildTitleIndex', () => {
  it('indexes the official title of each occupation first, then its other titles', () => {
    expect(INDEX.region).toBe('us');
    expect(INDEX.titles.map(({ text, language, official }) => [text, language, official])).toEqual([
      ['Payroll and Timekeeping Clerks', 'en', true],
      ['Payroll Clerk', 'en', false],
      ['Gehaltsbuchhalter', 'de', false],
      ['Accounting Clerks', 'en', true],
      ['Clerk', 'en', false],
    ]);
  });

  it('leaves out titles that have no meaningful word', () => {
    expect(INDEX.titles.some((title) => title.text === 'of the')).toBe(false);
  });

  it('keeps the qualifier and the code of a title, with the words of the qualifier apart', () => {
    const clerk = INDEX.titles.find((title) => title.text === 'Clerk');

    expect(clerk).toMatchObject({
      qualifier: 'ledger posting',
      isco08: '4311',
      tokens: ['clerk'],
      qualifierTokens: ['ledger', 'posting'],
    });
  });

  it('lists, for each word, the positions of the titles that contain it', () => {
    expect(INDEX.postings.get('payroll')).toEqual([0, 1]);
    expect(INDEX.postings.get('clerk')).toEqual([0, 1, 3, 4]);
    expect(INDEX.postings.get('posting')).toEqual([4]);
  });

  it('weighs a word by how few titles contain it', () => {
    const titles = INDEX.titles.length;

    expect(INDEX.rarity.get('clerk')).toBeCloseTo(Math.log(1 + titles / 4));
    expect(INDEX.rarity.get('payroll')).toBeCloseTo(Math.log(1 + titles / 2));
    expect(INDEX.unknownWordRarity).toBeCloseTo(Math.log(1 + titles));
    expect(INDEX.rarity.get('gehaltsbuchhalter')).toBe(INDEX.unknownWordRarity);
  });

  it('keeps every word once, sorted, for completing a word being typed', () => {
    expect(INDEX.vocabulary).toEqual([...new Set(INDEX.vocabulary)].toSorted());
    expect(INDEX.vocabulary).toHaveLength(INDEX.postings.size);
  });
});
