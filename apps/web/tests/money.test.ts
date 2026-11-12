import { describe, expect, it } from 'vitest';

import { formatMoney, formatWholeAmount } from '../src/i18n/format.ts';

/** `Intl` separates the figure from its symbol with a no-break space. */
const nbsp = (text: string) => text.replaceAll(' ', '\u00a0');

describe('money', () => {
  it('writes each currency as its language does', () => {
    expect(formatMoney({ currency: 'USD', minorUnits: 1900 }, 'en')).toBe('$19');
    expect(formatMoney({ currency: 'GBP', minorUnits: 3950 }, 'en')).toBe('£39.50');
    expect(formatMoney({ currency: 'EUR', minorUnits: 4500 }, 'es')).toBe(nbsp('45 €'));
    expect(formatMoney({ currency: 'EUR', minorUnits: 4550 }, 'es')).toBe(nbsp('45,50 €'));
    expect(formatMoney({ currency: 'USD', minorUnits: 5900 }, 'es')).toBe(nbsp('59 US$'));
  });

  it('writes published salaries without decimals', () => {
    expect(formatWholeAmount(58260, 'USD', 'en')).toBe('$58,260');
    expect(formatWholeAmount(40936, 'GBP', 'es')).toBe(nbsp('40.936 GBP'));
  });
});
