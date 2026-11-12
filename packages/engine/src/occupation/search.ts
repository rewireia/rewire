import type { RegionalOccupation } from '@rewire/data';

import { compareCodes } from '../text/compare-codes.ts';
import { tokensOf } from '../text/tokens.ts';

import type { IndexedTitle, TitleIndex } from './title-index.ts';
import { resolveUnitGroup, type UnitGroupResolution } from './unit-group.ts';

/** How well the best title of an occupation matches what the person wrote. */
export type MatchStrength = 'exact' | 'strong' | 'partial';

export interface OccupationMatch {
  readonly occupation: RegionalOccupation;
  /** The title that matched, which may not be the official one. */
  readonly matchedTitle: Pick<IndexedTitle, 'text' | 'language' | 'qualifier' | 'official'>;
  /** From 0 to 1: 1 when the title says exactly what the person wrote. */
  readonly score: number;
  readonly strength: MatchStrength;
  /** Missing when the occupation has no bridge to ISCO-08. */
  readonly unitGroup: UnitGroupResolution | undefined;
}

export interface SearchOptions {
  /** Most matches to return. */
  readonly limit?: number;
  /** Languages the person reads, best first. Among equal matches, their titles come first. */
  readonly preferredLanguages?: readonly string[];
}

const DEFAULT_LIMIT = 8;
/** Below this, a title shares too little with the query to be worth showing. */
const MINIMUM_SCORE = 0.3;
const EXACT_SCORE = 0.999;
const STRONG_SCORE = 0.75;
/** A word still being typed counts less than a finished one. */
const PREFIX_FACTOR = 0.8;
const MINIMUM_PREFIX_LENGTH = 3;
/**
 * A word still being typed completes to this many words at most, the most common first. The
 * EU titles come in two dozen languages, so a short prefix begins hundreds of words there.
 */
const MAXIMUM_PREFIX_COMPLETIONS = 50;
/**
 * A qualifier narrows a title ("Developer" in photographic processing), so the part of it
 * the person did not mention still counts against the match, at half weight.
 */
const UNMENTIONED_QUALIFIER_FACTOR = 0.5;

/** A word of the query with the words of the index it may stand for. */
interface QueryTerm {
  /** Rarity of the word as written; unknown words are as rare as a word can be. */
  readonly rarity: number;
  /** True when some title contains the word exactly as written. */
  readonly known: boolean;
  /** Index word → how much of the query word it satisfies (1 exact, less for a prefix). */
  readonly completions: ReadonlyMap<string, number>;
}

/** The words a query is scored against. */
type TitleWords = Pick<IndexedTitle, 'tokens' | 'qualifierTokens'>;

/** A match with the position of its title's language among the preferred ones. */
interface CandidateMatch {
  readonly match: OccupationMatch;
  /** 0 for the first preferred language; the number of preferred languages for any other. */
  readonly languageRank: number;
}

/** A match with what is needed to order it among equal scores. */
interface RankedMatch extends CandidateMatch {
  /** How much the query has in common with the official title of the occupation. */
  readonly officialAffinity: number;
}

/**
 * Finds the occupations whose titles best match a free-text job title.
 *
 * Titles are compared word by word and rarer words weigh more, so "payroll" counts for more
 * than "clerk". The score is the weighted share of words the query and the title have
 * in common. One result is returned per occupation and unit group, with its best title.
 */
export function searchOccupations(
  index: TitleIndex,
  query: string,
  options: SearchOptions = {},
): OccupationMatch[] {
  const terms = queryTermsOf(index, tokensOf(query));
  const languages = options.preferredLanguages ?? [];
  const best = new Map<string, CandidateMatch>();
  for (const position of candidatePositions(index, terms)) {
    const title = index.titles[position];
    if (title === undefined) {
      continue;
    }
    const score = scoreOf(index, title, terms);
    if (score < MINIMUM_SCORE) {
      continue;
    }
    const language = languages.indexOf(title.language);
    const candidate: CandidateMatch = {
      match: toMatch(title, score),
      languageRank: language === -1 ? languages.length : language,
    };
    const key = `${title.occupation.code}|${candidate.match.unitGroup?.isco08 ?? ''}`;
    const known = best.get(key);
    if (known === undefined || byBestTitle(candidate, known) < 0) {
      best.set(key, candidate);
    }
  }

  return [...best.values()]
    .map((candidate): RankedMatch => ({
      ...candidate,
      officialAffinity: scoreOf(index, officialWordsOf(candidate.match.occupation), terms),
    }))
    .toSorted(byRelevance)
    .slice(0, options.limit ?? DEFAULT_LIMIT)
    .map(({ match }) => match);
}

function queryTermsOf(index: TitleIndex, tokens: readonly string[]): QueryTerm[] {
  return tokens.map((token, position) => {
    const known = index.postings.has(token);
    const completions = new Map<string, number>(known ? [[token, 1]] : []);
    const stillTyping = position === tokens.length - 1;
    if (stillTyping && token.length >= MINIMUM_PREFIX_LENGTH) {
      for (const word of prefixCompletionsOf(index, token)) {
        if (!completions.has(word)) {
          completions.set(word, PREFIX_FACTOR);
        }
      }
    }
    return { rarity: rarityOf(index, token), known, completions };
  });
}

/**
 * The words of the index a word still being typed may complete to: those in the most titles
 * first, and among equally common words, the one that sorts first.
 */
export function prefixCompletionsOf(index: TitleIndex, prefix: string): string[] {
  const titlesWith = (word: string) => index.postings.get(word)?.length ?? 0;
  // The vocabulary is sorted, so a stable sort keeps equally common words in that order.
  return wordsStartingWith(index.vocabulary, prefix)
    .toSorted((a, b) => titlesWith(b) - titlesWith(a))
    .slice(0, MAXIMUM_PREFIX_COMPLETIONS);
}

/** Binary search over the sorted vocabulary for every word that begins with a prefix. */
function wordsStartingWith(vocabulary: readonly string[], prefix: string): string[] {
  let low = 0;
  let high = vocabulary.length;
  while (low < high) {
    const middle = (low + high) >>> 1;
    if ((vocabulary[middle] ?? '') < prefix) {
      low = middle + 1;
    } else {
      high = middle;
    }
  }
  let end = low;
  while (vocabulary[end]?.startsWith(prefix) === true) {
    end += 1;
  }
  return vocabulary.slice(low, end);
}

function candidatePositions(index: TitleIndex, terms: readonly QueryTerm[]): Set<number> {
  const positions = new Set<number>();
  for (const term of terms) {
    for (const word of term.completions.keys()) {
      for (const position of index.postings.get(word) ?? []) {
        positions.add(position);
      }
    }
  }
  return positions;
}

/**
 * Twice the weight the query and the title share, over the weight of both: 1 when they say
 * the same, 0 when they share nothing.
 *
 * Each word of the title, or of its qualifier, satisfies one term of the query at most, so
 * the shared weight never exceeds the weight of the title and the score never exceeds 1.
 */
function scoreOf(index: TitleIndex, title: TitleWords, terms: readonly QueryTerm[]): number {
  const titleWords = new Set(title.tokens);
  const qualifierWords = new Set(title.qualifierTokens);
  const mentionedQualifierWords = new Set<string>();
  const usedWords = new Set<string>();
  let shared = 0;
  let queryWeight = 0;

  for (const term of terms) {
    const found =
      bestCompletionIn(term, titleWords, usedWords) ??
      bestCompletionIn(term, qualifierWords, usedWords);
    // A word still being typed weighs what the word it completes to weighs.
    const weight = term.known || found === undefined ? term.rarity : rarityOf(index, found.word);
    queryWeight += weight;
    if (found !== undefined) {
      usedWords.add(found.word);
      shared += found.factor * weight;
      if (!titleWords.has(found.word)) {
        mentionedQualifierWords.add(found.word);
      }
    }
  }

  const titleWeight =
    weightOf(index, title.tokens) +
    title.qualifierTokens.reduce((sum, word) => {
      const factor = mentionedQualifierWords.has(word) ? 1 : UNMENTIONED_QUALIFIER_FACTOR;
      return sum + factor * rarityOf(index, word);
    }, 0);
  return queryWeight + titleWeight === 0 ? 0 : (2 * shared) / (queryWeight + titleWeight);
}

/** The completion of a term that best matches a word not yet satisfied by an earlier term. */
function bestCompletionIn(
  term: QueryTerm,
  words: ReadonlySet<string>,
  usedWords: ReadonlySet<string>,
): { word: string; factor: number } | undefined {
  let best: { word: string; factor: number } | undefined;
  for (const [word, factor] of term.completions) {
    const free = words.has(word) && !usedWords.has(word);
    if (free && (best === undefined || factor > best.factor)) {
      best = { word, factor };
    }
  }
  return best;
}

function weightOf(index: TitleIndex, words: readonly string[]): number {
  return words.reduce((sum, word) => sum + rarityOf(index, word), 0);
}

function rarityOf(index: TitleIndex, word: string): number {
  return index.rarity.get(word) ?? index.unknownWordRarity;
}

function officialWordsOf(occupation: RegionalOccupation): TitleWords {
  return { tokens: tokensOf(occupation.title), qualifierTokens: [] };
}

function toMatch(title: IndexedTitle, score: number): OccupationMatch {
  return {
    occupation: title.occupation,
    matchedTitle: {
      text: title.text,
      language: title.language,
      qualifier: title.qualifier,
      official: title.official,
    },
    score,
    strength: strengthOf(score),
    unitGroup: resolveUnitGroup(title.occupation, title),
  };
}

function strengthOf(score: number): MatchStrength {
  if (score >= EXACT_SCORE) {
    return 'exact';
  }
  return score >= STRONG_SCORE ? 'strong' : 'partial';
}

/**
 * Among the titles of one occupation and unit group, the one to show: higher score first,
 * then the official title, then a title in a preferred language, best first, then the
 * shorter one. Titles equal in all of these keep their order in the index.
 */
function byBestTitle(a: CandidateMatch, b: CandidateMatch): number {
  return (
    b.match.score - a.match.score ||
    Number(b.match.matchedTitle.official) - Number(a.match.matchedTitle.official) ||
    a.languageRank - b.languageRank ||
    a.match.matchedTitle.text.length - b.match.matchedTitle.text.length
  );
}

/**
 * Higher score first. Among equal scores: the occupation whose official title is closest
 * to the query, then a title in a language the person reads, then a stable order.
 */
function byRelevance(a: RankedMatch, b: RankedMatch): number {
  return (
    b.match.score - a.match.score ||
    b.officialAffinity - a.officialAffinity ||
    a.languageRank - b.languageRank ||
    a.match.matchedTitle.text.length - b.match.matchedTitle.text.length ||
    compareCodes(a.match.occupation.code, b.match.occupation.code) ||
    compareCodes(a.match.unitGroup?.isco08 ?? '', b.match.unitGroup?.isco08 ?? '')
  );
}
