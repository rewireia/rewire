import type { CourseCard } from '@rewire/contracts';

import type { Language } from '../../app/preferences.ts';
import { formatList } from '../../i18n/format.ts';

/** How the sentence names a country, for the countries PayPal documents pay-later in. */
const COUNTRY: Readonly<Record<Language, Readonly<Record<string, string>>>> = {
  en: { US: 'the US', GB: 'the UK', DE: 'Germany', ES: 'Spain', FR: 'France', IT: 'Italy' },
  es: {
    US: 'EE. UU.',
    GB: 'el Reino Unido',
    DE: 'Alemania',
    ES: 'España',
    FR: 'Francia',
    IT: 'Italia',
  },
};

function countryName(code: string, language: Language): string {
  return (
    COUNTRY[language][code] ?? new Intl.DisplayNames(language, { type: 'region' }).of(code) ?? code
  );
}

/**
 * The pay-later products documented for a price, grouped by country: "Pay in 4 and Pay
 * Monthly in the US". `null` when none is documented.
 */
export function payLaterOffers(
  hints: CourseCard['payLater'],
  language: Language,
  joiner: (products: string, country: string) => string,
): string | null {
  if (hints.length === 0) {
    return null;
  }
  const byCountry = new Map<string, string[]>();
  for (const { country, product } of hints) {
    byCountry.set(country, [...(byCountry.get(country) ?? []), product]);
  }
  const offers = [...byCountry].map(([country, products]) =>
    joiner(formatList(products, language), countryName(country, language)),
  );
  return formatList(offers, language);
}
