/** Stop words of each language the classifications use, separated by single spaces. */
const STOP_WORDS_BY_LANGUAGE = {
  en: 'a an and as at for in of on or the to with',
  es: 'con de del el en la las los o para por un una y',
  de: 'das der die fur im mit und von zu',
  fr: 'au aux d des du et l le les pour',
  it: 'dei della di e gli i il lo per',
} as const;

/**
 * Words that carry no meaning in a job title, in the languages the classifications use.
 * Written as they look after folding: lower case and without accents.
 */
export const STOP_WORDS: ReadonlySet<string> = new Set(
  Object.values(STOP_WORDS_BY_LANGUAGE).flatMap((words) => words.split(' ')),
);
