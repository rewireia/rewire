import { describe, expect, it } from 'vitest';

import { formatDate, formatPoints, interpolate, toPoints, translate } from '../src/i18n/format.ts';

describe('formatters', () => {
  it('turn a score into whole points from 0 to 100', () => {
    expect(toPoints(0.6065)).toBe(61);
    expect(toPoints(0)).toBe(0);
    expect(toPoints(1)).toBe(100);
    expect(formatPoints(0.5075, 'en')).toBe('51');
  });

  it('fill placeholders and write numbers in the language', () => {
    expect(interpolate('{shown} of {total}', { shown: 1234, total: 5 }, 'en')).toBe('1,234 of 5');
    expect(interpolate('{shown} de {total}', { shown: 1234, total: 5 }, 'es')).toBe('1234 de 5');
    expect(interpolate('{shown} de {total}', { shown: 12345, total: 5 }, 'es')).toBe('12.345 de 5');
  });

  it('leave an unknown placeholder as it is', () => {
    expect(interpolate('Hello {name}', {}, 'en')).toBe('Hello {name}');
  });

  it('translate a key in each language', () => {
    expect(translate('en', 'report.standing.figure', { rank: 8, total: 427 })).toBe('8 of 427');
    expect(translate('es', 'report.standing.figure', { rank: 8, total: 427 })).toBe('8 de 427');
  });

  it('write a retrieval date in the long form of the language', () => {
    expect(formatDate('2026-11-11', 'en')).toBe('November 11, 2026');
    expect(formatDate('2026-11-11', 'es')).toBe('11 de noviembre de 2026');
    expect(formatDate('not a date', 'en')).toBe('not a date');
  });
});
