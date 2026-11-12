import { describe, expect, it } from 'vitest';

import { collapseWhitespace, distinctTitles } from '../pipeline/steps/titles.ts';
import type { JobTitle } from '../src/index.ts';

describe('collapseWhitespace', () => {
  it('trims a title and collapses every run of inner whitespace to one space', () => {
    expect(collapseWhitespace('  Payroll \t clerk\n (senior) ')).toBe('Payroll clerk (senior)');
  });
});

describe('distinctTitles', () => {
  const english = (text: string): JobTitle => ({ text, language: 'en' });

  it('drops entries shorter than three characters and keeps the rest', () => {
    const titles = ['QS', 'A1', 'CEO', 'Accountant'].map(english);

    expect(distinctTitles(titles).map((title) => title.text)).toEqual(['CEO', 'Accountant']);
  });

  it('drops repeats that differ only in case, keeping the first', () => {
    const titles = ['Payroll Clerk', 'payroll clerk', 'PAYROLL CLERK'].map(english);

    expect(distinctTitles(titles)).toEqual([english('Payroll Clerk')]);
  });

  it('keeps titles that share a text but differ in language, qualifier or code', () => {
    const base: JobTitle = { text: 'Controller', language: 'en' };
    const variants: JobTitle[] = [
      { ...base, language: 'de' },
      { ...base, qualifier: 'air traffic' },
      { ...base, isco08: '1211' },
    ];
    for (const variant of variants) {
      expect(distinctTitles([base, variant])).toEqual([base, variant]);
    }
  });

  it('compares qualifiers without regard to case', () => {
    const titles: JobTitle[] = [
      { text: 'Developer', language: 'en', qualifier: 'Photographic processing' },
      { text: 'developer', language: 'en', qualifier: 'photographic processing' },
    ];

    expect(distinctTitles(titles)).toHaveLength(1);
  });
});
