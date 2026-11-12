/** A stretch of a paragraph: plain words, or words that link to a source. */
export type Inline = { readonly text: string } | { readonly text: string; readonly href: string };

const LINK = /\[([^\]]+)\]\((https:\/\/[^)\s]+)\)/g;

/** Splits a paragraph written with `[words](https://…)` links into plain and linked stretches. */
export function inlinesOf(paragraph: string): readonly Inline[] {
  const parts: Inline[] = [];
  let from = 0;
  for (const match of paragraph.matchAll(LINK)) {
    const [whole, text = '', href = ''] = match;
    if (match.index > from) {
      parts.push({ text: paragraph.slice(from, match.index) });
    }
    parts.push({ text, href });
    from = match.index + whole.length;
  }
  if (from < paragraph.length) {
    parts.push({ text: paragraph.slice(from) });
  }
  return parts;
}

/** Words an adult reads in a minute, for a reading time that is said, never guessed. */
const WORDS_PER_MINUTE = 200;

/** Minutes to read these paragraphs, from their words, rounded to the nearest whole minute. */
export function readingMinutes(paragraphs: readonly string[]): number {
  const words = paragraphs
    .flatMap((paragraph) => inlinesOf(paragraph).map((part) => part.text))
    .join(' ')
    .split(/\s+/)
    .filter(Boolean).length;
  return Math.max(1, Math.round(words / WORDS_PER_MINUTE));
}
