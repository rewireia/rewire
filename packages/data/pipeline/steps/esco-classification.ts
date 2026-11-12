import { z } from 'zod';

import type { JobTitle, RegionalClassification, RegionalOccupation } from '../../src/index.ts';
import { ESCO_OCCUPATIONS } from '../sources.ts';

import { compareCodes } from './compare-codes.ts';
import { collapseWhitespace, distinctTitles } from './titles.ts';

/** Languages kept from the 28 ESCO publishes: English plus four large EU languages. */
const EU_LANGUAGES = ['en', 'es', 'de', 'fr', 'it'] as const;

const escoOccupationSchema = z.object({
  uri: z.string().min(1),
  /** The first four digits are the ISCO-08 unit group the occupation belongs to. */
  code: z.string().regex(/^\d{4}(\.\d+)+$/),
  preferredLabel: z.record(z.string(), z.string()),
  alternativeLabel: z.record(z.string(), z.array(z.string())).optional(),
  description: z.record(z.string(), z.object({ literal: z.string() })).optional(),
});

const escoPageSchema = z.object({
  total: z.number().int(),
  _embedded: z.object({ results: z.array(escoOccupationSchema) }),
});

type EscoOccupation = z.infer<typeof escoOccupationSchema>;

export interface EscoStepResult {
  readonly classification: RegionalClassification;
  /** ISCO-08 unit group of each ESCO occupation, for crosswalks that cite ESCO by URI. */
  readonly iscoByUri: ReadonlyMap<string, string>;
}

/**
 * Turns the pages of the ESCO API into the EU classification.
 *
 * The API cannot be pinned by digest, so it is pinned by size: the pages must hold and
 * announce exactly `expectedTotal` occupations.
 */
export function buildEuClassification(
  pages: readonly unknown[],
  expectedTotal: number,
): EscoStepResult {
  const parsed = pages.map((page) => escoPageSchema.parse(page));
  const occupations = parsed.flatMap((page) => page._embedded.results);
  const announced = parsed[0]?.total ?? 0;
  if (occupations.length !== announced || announced !== expectedTotal) {
    throw new Error(
      `ESCO returned ${occupations.length} occupations and announces ${announced}; ` +
        `${expectedTotal} were expected`,
    );
  }
  return {
    classification: {
      region: 'eu',
      scheme: {
        name: 'ESCO',
        version: ESCO_OCCUPATIONS.version,
        publisher: ESCO_OCCUPATIONS.publisher,
      },
      languages: [...EU_LANGUAGES],
      occupations: occupations.map(toOccupation).toSorted((a, b) => compareCodes(a.code, b.code)),
    },
    iscoByUri: new Map(occupations.map((occupation) => [occupation.uri, iscoOf(occupation)])),
  };
}

function iscoOf(occupation: EscoOccupation): string {
  return occupation.code.slice(0, 4);
}

function toOccupation(occupation: EscoOccupation): RegionalOccupation {
  const title = occupation.preferredLabel['en'];
  if (title === undefined) {
    throw new Error(`ESCO occupation ${occupation.code} has no English title`);
  }
  const description = occupation.description?.['en']?.literal;
  return {
    code: occupation.code,
    title: collapseWhitespace(title),
    ...(description === undefined ? {} : { description: collapseWhitespace(description) }),
    iscoLinks: [{ isco08: iscoOf(occupation), basis: 'classification', support: 1 }],
    titles: distinctTitles(EU_LANGUAGES.flatMap((language) => titlesIn(occupation, language))),
  };
}

function titlesIn(occupation: EscoOccupation, language: string): JobTitle[] {
  // Preferred labels outside English join the gendered forms with a slash.
  const preferred =
    language === 'en' ? [] : (occupation.preferredLabel[language]?.split('/') ?? []);
  const alternatives = occupation.alternativeLabel?.[language] ?? [];
  return [...preferred, ...alternatives].map((text) => ({
    text: collapseWhitespace(text),
    language,
  }));
}
