import type { GuideLanguage, Region } from '@rewire/contracts';
import type { Engine, OccupationMatch } from '@rewire/engine';

/** Narrow, bilingual descriptions whose workplace or duties do not identify a single role. */
const HOSPITALITY_DESCRIPTION = [
  /^(?:soy camarer[oa]|trabajo (?:en|a) (?:un |una |el |la )?bar)[.!?\s]*$/i,
  /^(?:i work (?:in|at) (?:a |the )?bar|i serve drinks)[.!?\s]*$/i,
];

const WORKPLACE_DESCRIPTION = {
  bakery: [
    /^trabajo (?:en|a) (?:una |la )?panader[ií]a[.!?\s]*$/i,
    /^i work (?:in|at) (?:a |the )?bakery[.!?\s]*$/i,
  ],
  pizzeria: [
    /^trabajo (?:en|a) (?:una |la )?pizzer[ií]a[.!?\s]*$/i,
    /^i work (?:in|at) (?:a |the )?(?:pizzeria|pizza (?:shop|restaurant))[.!?\s]*$/i,
  ],
} as const;

const WORKPLACE_QUESTION: Readonly<
  Record<keyof typeof WORKPLACE_DESCRIPTION, Readonly<Record<GuideLanguage, string>>>
> = {
  bakery: {
    en: 'Do you bake, sell to customers, or do something else?',
    es: '¿Preparas el pan, atiendes a clientes o haces otra cosa?',
  },
  pizzeria: {
    en: 'Do you prepare food, serve customers, deliver orders, or do something else?',
    es: '¿Preparas comida, atiendes a clientes, repartes pedidos o haces otra cosa?',
  },
};

const HOSPITALITY_QUESTION: Readonly<Record<GuideLanguage, string>> = {
  en: 'Do you mainly work behind the bar, or serve customers at tables?',
  es: '¿Trabajas principalmente detrás de la barra o atiendes mesas?',
};

/** Remove only a complete greeting at the start of a local search. */
export function withoutGreeting(text: string): string {
  return text
    .trim()
    .replace(
      /^(?:hola|hi|hello|buenos d[ií]as|buenas tardes|buenas noches)(?:[,!¡.]+\s*|\s+)/iu,
      '',
    );
}

/** Search official titles, never substitute invented occupation records or tasks. */
export function descriptionSearch(
  engine: Engine,
  region: Region,
  text: string,
  language: GuideLanguage,
): { matches: OccupationMatch[]; note: string } | undefined {
  const [title = '', ...details] = text.trim().split(/\r?\n/u);
  const detail = details.join(' ').trim();
  if (detail === '') {
    const workplace = Object.entries(WORKPLACE_DESCRIPTION).find(([, patterns]) =>
      patterns.some((pattern) => pattern.test(title.trim())),
    )?.[0] as keyof typeof WORKPLACE_DESCRIPTION | undefined;
    if (workplace !== undefined) {
      const seller =
        region === 'us'
          ? 'retail salesperson'
          : region === 'eu'
            ? 'bakery sales'
            : 'shop assistant';
      const titles = workplace === 'bakery' ? ['baker', seller] : ['pizza maker', 'waiter'];
      const matches = searchTitles(engine, region, titles);
      if (workplace === 'pizzeria') {
        const delivery = pizzaDelivery(engine, region);
        if (delivery !== undefined) matches.push(delivery);
      }
      return { matches, note: WORKPLACE_QUESTION[workplace][language] };
    }
    // Spanish ESCO explicitly lists both forms for the same baker occupation.
    if (/^(?:soy |trabajo como )?panader[oa][.!?\s]*$/i.test(title.trim())) {
      return {
        matches: searchTitles(engine, region, ['baker']),
        note: language === 'es' ? '¿Es esta tu ocupación?' : 'Is this your occupation?',
      };
    }
  }
  const drinks = /^(?:sirvo bebidas|i serve drinks)[.!?\s]*$/i;
  if (
    !HOSPITALITY_DESCRIPTION.some((pattern) => pattern.test(title.trim())) ||
    (detail !== '' && !drinks.test(detail))
  ) {
    return undefined;
  }
  return {
    matches: searchTitles(engine, region, ['bartender', 'waiter']),
    note: HOSPITALITY_QUESTION[language],
  };
}

/** Delivery by car or van is plausible here; do not suggest a heavy-goods driver. */
function pizzaDelivery(engine: Engine, region: Region): OccupationMatch | undefined {
  const query = region === 'eu' ? 'car and van delivery driver' : 'pizza delivery driver';
  return engine
    .searchOccupations(region, query, { limit: 5 })
    .find((match) => match.unitGroup?.isco08 === '8322');
}

function searchTitles(
  engine: Engine,
  region: Region,
  titles: readonly string[],
): OccupationMatch[] {
  return titles.flatMap((title) => {
    const match = engine.searchOccupations(region, title, { limit: 1 })[0];
    return match === undefined ? [] : [match];
  });
}

/**
 * Use Spanish ESCO titles as a language bridge, retaining only regional search results
 * linked to the same ISCO group. A shared group is a candidate, not an equivalence of jobs.
 */
export function spanishTitleBridge(
  engine: Engine,
  region: Region,
  text: string,
): OccupationMatch[] {
  if (region === 'eu') return [];
  const query = text.trim().replace(/^(?:soy|trabajo como)\s+/i, '');
  const esco = engine.searchOccupations('eu', query, {
    limit: 12,
    preferredLanguages: ['es'],
  });
  const candidates = new Map<string, OccupationMatch>();
  for (const match of esco) {
    const group = match.unitGroup?.isco08;
    if (match.matchedTitle.language !== 'es' || match.score < 0.65 || group === undefined) {
      continue;
    }
    const regional = engine
      .searchOccupations(region, match.occupation.title, { limit: 12 })
      .find((candidate) => candidate.unitGroup?.isco08 === group);
    if (regional !== undefined && !candidates.has(group)) candidates.set(group, regional);
  }
  return [...candidates.values()].slice(0, 5);
}
