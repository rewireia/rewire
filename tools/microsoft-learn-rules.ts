import { createHash } from 'node:crypto';

import type { CatalogueSnapshot, CourseLevel } from '@rewire/content';
import { z } from 'zod';

import { topicsOf } from './microsoft-learn-topics.ts';

/** The public catalogue of Microsoft Learn, meant for showing its training on other sites. */
export const MICROSOFT_LEARN_CATALOGUE =
  'https://learn.microsoft.com/api/catalog/?locale=en-us&type=learningPaths,courses';

const MAX_ID_LENGTH = 80;
const MAX_SUMMARY_LENGTH = 400;
/** A first sentence longer than this is kept alone rather than joined to a second one. */
const ONE_SENTENCE_LENGTH = 220;

const itemSchema = z.object({
  uid: z.string().min(1),
  type: z.enum(['learningPath', 'course']),
  title: z.string().min(1),
  summary: z.string(),
  url: z.url(),
  levels: z.array(z.string()).default([]),
  roles: z.array(z.string()).default([]),
  products: z.array(z.string()).default([]),
  duration_in_minutes: z.number().nonnegative().optional(),
  duration_in_hours: z.number().nonnegative().optional(),
  locale: z.string().optional(),
  locales: z.array(z.string()).optional(),
});

type CatalogueItem = z.infer<typeof itemSchema>;

/** The part of the catalogue answer the capture reads; other fields are ignored. */
const catalogueAnswerSchema = z.object({
  learningPaths: z.array(itemSchema),
  courses: z.array(itemSchema),
});

const ENTITIES: Readonly<Record<string, string>> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
};

function decodeEntities(text: string): string {
  return text.replace(/&(#\d+|#x[\da-f]+|[a-z]+);/gi, (entity, name: string) => {
    if (name.startsWith('#x') || name.startsWith('#X'))
      return String.fromCodePoint(Number.parseInt(name.slice(2), 16));
    if (name.startsWith('#')) return String.fromCodePoint(Number(name.slice(1)));
    return ENTITIES[name.toLowerCase()] ?? entity;
  });
}

/** The first paragraph of a summary as plain text: no markup, entities or runs of spaces. */
export function plainSummary(html: string): string {
  const firstPart = html.split(/<h\d[^>]*>/i)[0] ?? html;
  const paragraph = /<p[^>]*>([\s\S]*?)<\/p>/i.exec(firstPart)?.[1] ?? firstPart;
  return decodeEntities(paragraph.replace(/<[^>]*>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim();
}

/** One or two sentences of a plain summary, cut at a word when even one is too long. */
export function shortSummary(text: string): string {
  const sentences = text.split(/(?<=[.!?])\s+(?=[A-Z0-9"“])/);
  const first = sentences[0] ?? text;
  const second = sentences[1];
  const joined =
    second === undefined || first.length > ONE_SENTENCE_LENGTH ? first : `${first} ${second}`;
  if (joined.length <= MAX_SUMMARY_LENGTH) return joined;
  const cut = joined.slice(0, MAX_SUMMARY_LENGTH - 1);
  return `${cut.slice(0, cut.lastIndexOf(' '))}…`;
}

/** The address of the course without the tracking parameter the catalogue adds. */
export function cleanUrl(url: string): string {
  const parsed = new URL(url);
  parsed.searchParams.delete('WT.mc_id');
  return parsed.toString();
}

/** A stable slug of the catalogue uid, shortened with a digest when it would be too long. */
export function courseIdOf(uid: string): string {
  const slug = uid
    .replace(/^(learn|course)\./, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  const id = `mslearn-${slug}`;
  if (id.length <= MAX_ID_LENGTH) return id;
  const digest = createHash('sha256').update(uid).digest('hex').slice(0, 8);
  return `${id.slice(0, MAX_ID_LENGTH - digest.length - 1).replace(/-$/, '')}-${digest}`;
}

const LEVELS: Readonly<Record<string, CourseLevel>> = {
  beginner: 'introductory',
  intermediate: 'intermediate',
  advanced: 'advanced',
};

/** The lowest level the catalogue gives the course; introductory when it gives none. */
export function levelOf(levels: readonly string[]): CourseLevel {
  const known = levels.flatMap((level) => (LEVELS[level] ? [LEVELS[level]] : []));
  const order: readonly CourseLevel[] = ['introductory', 'intermediate', 'advanced'];
  return order.find((level) => known.includes(level)) ?? 'introductory';
}

/** Hours as the catalogue states them, to one decimal; null when it states none. */
export function hoursOf(item: Pick<CatalogueItem, 'duration_in_minutes' | 'duration_in_hours'>) {
  if (item.duration_in_hours !== undefined && item.duration_in_hours > 0)
    return item.duration_in_hours;
  if (item.duration_in_minutes !== undefined && item.duration_in_minutes > 0)
    return Math.max(0.1, Math.round(item.duration_in_minutes / 6) / 10);
  return null;
}

/** Two-letter languages of the course; a learning path read in English is offered in English. */
export function languagesOf(item: Pick<CatalogueItem, 'locale' | 'locales'>): string[] {
  const locales = item.locales ?? [item.locale ?? 'en'];
  const languages = locales.map((locale) => locale.slice(0, 2).toLowerCase());
  const valid = languages.filter((language) => /^[a-z]{2}$/.test(language));
  return valid.length === 0 ? ['en'] : [...new Set(valid)];
}

/** The snapshot of the catalogue: every course once, in a stable order. */
export function snapshotOf(answer: unknown, capturedOn: string): CatalogueSnapshot {
  const { learningPaths, courses } = catalogueAnswerSchema.parse(answer);
  const listed = [...learningPaths, ...courses].map((item) => ({
    id: courseIdOf(item.uid),
    title: item.title.trim(),
    url: cleanUrl(item.url),
    summary: shortSummary(plainSummary(item.summary)),
    summaryEs: null,
    topics: topicsOf(item),
    level: levelOf(item.levels),
    hours: hoursOf(item),
    languages: languagesOf(item),
  }));
  const unique = [...new Map(listed.map((course) => [course.id, course])).values()];
  return {
    provider: 'Microsoft Learn',
    source: MICROSOFT_LEARN_CATALOGUE,
    citation: `Source: Microsoft Learn public catalogue, read on ${capturedOn}.`,
    capturedOn,
    providerAccess: 'free',
    regions: [],
    courses: unique
      .filter((course) => course.summary.length > 0)
      .toSorted((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)),
  };
}
