import type {
  DataBundle,
  ExposureDataset,
  IscoLink,
  JobTitle,
  LabourContext,
  Region,
  RegionalClassification,
  RegionalOccupation,
  ScoredOccupation,
  ScoredTask,
} from '@rewire/data';

/** A job title in English unless another language is given. */
export function jobTitle(text: string, extra: Partial<Omit<JobTitle, 'text'>> = {}): JobTitle {
  return { text, language: 'en', ...extra };
}

/** A regional occupation linked, in order, to the given unit groups. */
export function occupation(
  code: string,
  title: string,
  links: readonly (string | IscoLink)[] = [],
  titles: readonly (string | JobTitle)[] = [],
): RegionalOccupation {
  return {
    code,
    title,
    iscoLinks: links.map((link) =>
      typeof link === 'string' ? { isco08: link, basis: 'classification', support: 1 } : link,
    ),
    titles: titles.map((entry) => (typeof entry === 'string' ? jobTitle(entry) : entry)),
  };
}

export function classification(
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

/** A task predicted by both models with the published score unless overridden. */
export function task(id: string, score: number, extra: Partial<ScoredTask> = {}): ScoredTask {
  return {
    id,
    text: `Task ${id}`,
    score,
    modelScores: { gpt4o: score, gemini: score },
    origin: 'predicted',
    ...extra,
  };
}

/** A scored unit group with one task per score, numbered from 1. */
export function scoredOccupation(
  isco08: string,
  title: string,
  scores: readonly number[],
  meanScore = scores.reduce((sum, score) => sum + score, 0) / scores.length,
): ScoredOccupation {
  return {
    isco08,
    title,
    majorGroup: isco08.charAt(0),
    meanScore,
    standardDeviation: 0.1,
    gradient: 'gradient-2',
    tasks: scores.map((score, index) => task(`${isco08}-${index + 1}`, score)),
  };
}

export function dataset(occupations: readonly ScoredOccupation[]): ExposureDataset {
  return {
    majorGroups: [
      { code: '2', title: 'Professionals' },
      { code: '4', title: 'Clerical support workers' },
    ],
    occupations: [...occupations],
  };
}

/** A bundle in memory, as the engine receives it after loading. */
export function bundle(
  exposure: ExposureDataset,
  classifications: Partial<Record<Region, RegionalClassification>> = {},
  labour: Partial<Record<Region, LabourContext>> = {},
): DataBundle {
  return {
    manifest: { formatVersion: 1, files: [], sources: [] },
    exposure,
    classifications: {
      eu: classifications.eu ?? classification('eu', []),
      us: classifications.us ?? classification('us', []),
      uk: classifications.uk ?? classification('uk', []),
    },
    labour: {
      eu: labour.eu ?? { region: 'eu' },
      us: labour.us ?? { region: 'us' },
      uk: labour.uk ?? { region: 'uk' },
    },
  };
}
