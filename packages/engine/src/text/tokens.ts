import { STOP_WORDS } from './stop-words.ts';

/** Lower-cases a text and removes its accents, so "Enfermería" and "enfermeria" are equal. */
export function fold(text: string): string {
  return text.normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase().replaceAll('ß', 'ss');
}

/**
 * Brings a word to the form shared by its singular and its plural.
 *
 * The rule is deliberately small: it only has to treat a query and a title the same way,
 * not to produce a real word.
 */
export function singular(word: string): string {
  if (word.length > 4 && word.endsWith('ies')) {
    return `${word.slice(0, -3)}y`;
  }
  if (word.length > 3 && word.endsWith('s') && !word.endsWith('ss')) {
    return word.slice(0, -1);
  }
  return word;
}

/** The distinct meaningful words of a job title or a query, in order of appearance. */
export function tokensOf(text: string): string[] {
  const words = fold(text)
    .split(/[^\p{L}\p{N}]+/u)
    .filter((word) => word !== '' && !STOP_WORDS.has(word))
    .map(singular);
  return [...new Set(words)];
}
