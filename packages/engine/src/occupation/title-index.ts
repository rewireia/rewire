import type { Region, RegionalClassification, RegionalOccupation } from '@rewire/data';

import { tokensOf } from '../text/tokens.ts';

/** One way of naming an occupation, prepared for search. */
export interface IndexedTitle {
  readonly occupation: RegionalOccupation;
  readonly text: string;
  readonly language: string;
  readonly qualifier: string | undefined;
  /** Unit group the source gives to this very title, if it codes titles one by one. */
  readonly isco08: string | undefined;
  /** True for the official title of the occupation, false for any other name. */
  readonly official: boolean;
  readonly tokens: readonly string[];
  /** Words of the qualifier. They count only when the query mentions them. */
  readonly qualifierTokens: readonly string[];
}

/** Every title of a region, with the lookups search needs. */
export interface TitleIndex {
  readonly region: Region;
  readonly titles: readonly IndexedTitle[];
  /** Positions in `titles` of the titles that contain each word. */
  readonly postings: ReadonlyMap<string, readonly number[]>;
  /** How rare each word is: the rarer, the more it tells occupations apart. */
  readonly rarity: ReadonlyMap<string, number>;
  /** Rarity given to a word no title contains. */
  readonly unknownWordRarity: number;
  /** Every word, sorted, to complete the word a person is still typing. */
  readonly vocabulary: readonly string[];
}

/** Every classification publishes its official titles in English. */
const OFFICIAL_TITLE_LANGUAGE = 'en';

/** Indexes the official and alternative titles of a regional classification. */
export function buildTitleIndex(classification: RegionalClassification): TitleIndex {
  const titles = classification.occupations.flatMap(titlesOf);
  const postings = new Map<string, number[]>();
  titles.forEach((title, position) => {
    for (const token of new Set([...title.tokens, ...title.qualifierTokens])) {
      const positions = postings.get(token);
      if (positions === undefined) {
        postings.set(token, [position]);
      } else {
        positions.push(position);
      }
    }
  });

  const rarityOf = (titlesWithWord: number) => Math.log(1 + titles.length / titlesWithWord);
  return {
    region: classification.region,
    titles,
    postings,
    rarity: new Map([...postings].map(([token, positions]) => [token, rarityOf(positions.length)])),
    unknownWordRarity: rarityOf(1),
    vocabulary: [...postings.keys()].toSorted(),
  };
}

function titlesOf(occupation: RegionalOccupation): IndexedTitle[] {
  const official: IndexedTitle = {
    occupation,
    text: occupation.title,
    language: OFFICIAL_TITLE_LANGUAGE,
    qualifier: undefined,
    isco08: undefined,
    official: true,
    tokens: tokensOf(occupation.title),
    qualifierTokens: [],
  };
  const others = occupation.titles.map((title): IndexedTitle => ({
    occupation,
    text: title.text,
    language: title.language,
    qualifier: title.qualifier,
    isco08: title.isco08,
    official: false,
    tokens: tokensOf(title.text),
    qualifierTokens: title.qualifier === undefined ? [] : tokensOf(title.qualifier),
  }));
  return [official, ...others].filter((title) => title.tokens.length > 0);
}
