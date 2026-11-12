import type { JobTitle } from '../../src/index.ts';

/** Shorter entries are grades and abbreviations ("A1", "QS"), not job titles. */
const MIN_TITLE_LENGTH = 3;

/** Trims a text, such as a title or a description, and collapses its inner whitespace. */
export function collapseWhitespace(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

/** Drops titles too short to be one and exact repeats, keeping the first of each. */
export function distinctTitles(titles: readonly JobTitle[]): JobTitle[] {
  const seen = new Set<string>();
  const distinct: JobTitle[] = [];
  for (const title of titles) {
    const key = [
      title.language,
      title.text.toLowerCase(),
      title.qualifier?.toLowerCase() ?? '',
      title.isco08 ?? '',
    ].join('\u0000');
    if (title.text.length >= MIN_TITLE_LENGTH && !seen.has(key)) {
      seen.add(key);
      distinct.push(title);
    }
  }
  return distinct;
}
