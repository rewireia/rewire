import { describe, expect, it } from 'vitest';

import { fromDecimalAmount, sameMoney, toDecimalAmount } from '../src/modules/checkout/money.ts';

describe('amounts as PayPal writes them', () => {
  it.each([
    [7, '0.07'],
    [1999, '19.99'],
    [123_450, '1234.50'],
    [4900, '49.00'],
    [0, '0.00'],
  ])('writes %i minor units as %s', (minorUnits, text) => {
    expect(toDecimalAmount({ currency: 'USD', minorUnits })).toBe(text);
  });

  it.each([
    ['0.07', 7],
    ['19.99', 1999],
    ['1234.5', 123_450],
    ['49', 4900],
  ])('reads %s exactly, without floating point', (text, minorUnits) => {
    expect(fromDecimalAmount(text, 'EUR')).toEqual({ currency: 'EUR', minorUnits });
  });

  it('reads back what it writes', () => {
    for (const minorUnits of [1, 7, 10, 99, 100, 1999, 123_450, 1_000_000]) {
      const money = { currency: 'GBP' as const, minorUnits };
      expect(fromDecimalAmount(toDecimalAmount(money), 'GBP')).toEqual(money);
    }
  });

  it.each(['', '1.234', '-1.00', '1,00', 'abc', '1e3', ' 1.00', '.50'])('refuses %j', (text) => {
    expect(fromDecimalAmount(text, 'USD')).toBeUndefined();
  });

  it('compares currency and amount', () => {
    expect(sameMoney({ currency: 'USD', minorUnits: 1 }, { currency: 'USD', minorUnits: 1 })).toBe(
      true,
    );
    expect(sameMoney({ currency: 'USD', minorUnits: 1 }, { currency: 'EUR', minorUnits: 1 })).toBe(
      false,
    );
  });
});
