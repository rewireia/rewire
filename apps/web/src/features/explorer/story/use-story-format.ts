import type { Currency } from '@rewire/contracts';
import { useMemo } from 'react';

import { formatMoney } from '../../../i18n/format.ts';
import { useMessages } from '../../../i18n/use-messages.ts';

/** The number and money formats of the data story, in the person's language. */
export function useStoryFormat() {
  const { language } = useMessages();
  return useMemo(() => {
    const percent = new Intl.NumberFormat(language, { style: 'percent', maximumFractionDigits: 0 });
    const compact = new Intl.NumberFormat(language, {
      notation: 'compact',
      maximumFractionDigits: 1,
    });
    return {
      percent: (share: number) => percent.format(share),
      compact: (value: number) => compact.format(value),
      /** Pay is published in whole units of its currency. */
      money: (currency: Currency, units: number) =>
        formatMoney({ currency, minorUnits: Math.round(units * 100) }, language),
    };
  }, [language]);
}
