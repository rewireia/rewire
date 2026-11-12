import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach } from 'vitest';

import type { BundleContents } from '../../pipeline/assemble.ts';
import { SOURCES } from '../../pipeline/sources.ts';
import {
  sha256Of,
  type JobTitle,
  type Region,
  type RegionalClassification,
  type RegionalOccupation,
  type ScoredOccupation,
} from '../../src/index.ts';

/** A unit group scored by the ILO, with one task per score, numbered from 1. */
export function scoredOccupation(
  isco08: string,
  title: string,
  scores: readonly number[],
): ScoredOccupation {
  return {
    isco08,
    title,
    majorGroup: isco08.charAt(0),
    meanScore: scores.reduce((sum, score) => sum + score, 0) / scores.length,
    standardDeviation: 0.1,
    gradient: 'gradient-2',
    tasks: scores.map((score, index) => ({
      id: `${isco08}-${index + 1}`,
      text: `Task ${index + 1} of ${title}`,
      score,
      modelScores: { gpt4o: score, gemini: score },
      origin: 'predicted',
    })),
  };
}

/** A regional occupation linked, in order, to the given unit groups. */
export function regionalOccupation(
  code: string,
  title: string,
  links: readonly string[] = [],
  titles: readonly JobTitle[] = [],
): RegionalOccupation {
  return {
    code,
    title,
    iscoLinks: links.map((isco08) => ({ isco08, basis: 'classification', support: 1 })),
    titles: [...titles],
  };
}

export function classificationOf(
  region: Region,
  occupations: readonly RegionalOccupation[],
): RegionalClassification {
  return {
    region,
    scheme: { name: 'Sample scheme', version: '1', publisher: 'Sample publisher' },
    languages: ['en'],
    occupations: [...occupations],
  };
}

/**
 * The smallest contents the bundle can be written from. Each source gets a digest of its
 * own id unless `digests` gives it another.
 */
export function sampleContents(digests: Readonly<Record<string, string>> = {}): BundleContents {
  const developers = scoredOccupation('2512', 'Software developers', [0.6, 0.5]);
  return {
    exposure: {
      majorGroups: [{ code: '2', title: 'Professionals' }],
      occupations: [developers],
    },
    rationales: Object.fromEntries(
      developers.tasks.map((task) => [task.id, { gpt4o: 'Mostly writing code.', gemini: null }]),
    ),
    classifications: {
      eu: classificationOf('eu', [regionalOccupation('2512.4', 'software developer', ['2512'])]),
      us: classificationOf('us', [
        regionalOccupation('15-1252.00', 'Software Developers', ['2512']),
      ]),
      uk: classificationOf('uk', [
        regionalOccupation('2134', 'Programmers and software development professionals', ['2512']),
      ]),
    },
    labour: {
      eu: {
        region: 'eu',
        employment: {
          level: 'isco-2-digit',
          period: '2025',
          source: 'eurostat-lfsa-egai2d',
          population: 'People in employment',
          counts: 'people',
          byCode: { '25': 5488200 },
          titles: { '25': 'Information and communications technology professionals' },
        },
      },
      us: {
        region: 'us',
        pay: {
          level: 'regional-occupation',
          period: 'May 2025',
          source: 'bls-oews',
          population: 'Wage and salary workers',
          currency: 'USD',
          measure: 'median-annual',
          byCode: { '15-1252': 133080 },
        },
      },
      uk: { region: 'uk' },
    },
    sourceDigests: new Map(
      SOURCES.map((source) => [source.id, digests[source.id] ?? sha256Of(Buffer.from(source.id))]),
    ),
    notes: [],
  };
}

/** Gives each test a fresh folder under the system temporary directory, removed afterwards. */
export function useTemporaryDirectory(): () => string {
  let directory: string | undefined;
  beforeEach(async () => {
    directory = await mkdtemp(path.join(os.tmpdir(), 'rewire-data-'));
  });
  afterEach(async () => {
    if (directory !== undefined) {
      await rm(directory, { recursive: true, force: true });
      directory = undefined;
    }
  });
  return () => {
    if (directory === undefined) {
      throw new Error('the temporary directory exists only while a test runs');
    }
    return directory;
  };
}
