import { z } from 'zod';

import type {
  IscoLink,
  IscoLinkBasis,
  RegionalClassification,
  RegionalOccupation,
} from '../../src/index.ts';
import type { CsvRecord } from '../readers/csv.ts';
import { ONET_DATABASE } from '../sources.ts';

import { compareCodes } from './compare-codes.ts';
import { collapseWhitespace, distinctTitles } from './titles.ts';

const onetCodeSchema = z.string().regex(/^\d{2}-\d{4}\.\d{2}$/);

const occupationRowSchema = z.object({
  'O*NET-SOC Code': onetCodeSchema,
  Title: z.string().min(1),
  Description: z.string(),
});

const jobTitleRowSchema = z.object({
  'O*NET-SOC Code': onetCodeSchema,
  'Job Title': z.string().min(1),
});

const crosswalkRowSchema = z.object({
  'O*NET Id': onetCodeSchema,
  'ESCO or ISCO URI': z.string().min(1),
  'Type of Match': z.enum(['exactMatch', 'exactISCO', 'closeMatch', 'narrowMatch', 'broadMatch']),
});

type CrosswalkRow = z.infer<typeof crosswalkRowSchema>;

const BASIS_BY_MATCH = {
  exactMatch: 'exact-match',
  exactISCO: 'exact-match',
  closeMatch: 'close-match',
  narrowMatch: 'narrow-match',
  broadMatch: 'broad-match',
} as const satisfies Record<CrosswalkRow['Type of Match'], IscoLinkBasis>;

/** Strongest relation first: the order in which links are preferred. */
const BASIS_PREFERENCE: readonly IscoLinkBasis[] = [
  'exact-match',
  'close-match',
  'narrow-match',
  'broad-match',
];

/** A crosswalk row that points at an ISCO-08 group instead of an ESCO occupation. */
const ISCO_URI = /\/esco\/isco\/C(\d+)$/;

export interface OnetStepInput {
  readonly occupations: readonly CsvRecord[];
  readonly jobTitles: readonly CsvRecord[];
  readonly crosswalk: readonly CsvRecord[];
  /** From the ESCO step: the unit group of each ESCO occupation. */
  readonly iscoByEscoUri: ReadonlyMap<string, string>;
}

export interface OnetStepResult {
  readonly classification: RegionalClassification;
  /** Crosswalk rows whose target is not an ESCO occupation or unit group we know. */
  readonly unresolvedCrosswalkRows: number;
  /** Crosswalk rows whose O*NET-SOC code is not among the O*NET occupations. */
  readonly orphanCrosswalkRows: number;
}

/**
 * Turns the O*NET occupations, their job titles and the ESCO–O*NET crosswalk into the US
 * classification.
 *
 * The United States has no current official table to ISCO-08, so each occupation reaches
 * it through the ESCO occupations the crosswalk relates it to. When they fall in several
 * unit groups, the links are ordered by a fixed rule: the strongest relation first, then
 * the most crosswalk rows, then the lowest code.
 */
export function buildUsClassification(input: OnetStepInput): OnetStepResult {
  const crosswalk = input.crosswalk.map((row) => crosswalkRowSchema.parse(row));
  const jobTitles = input.jobTitles.map((row) => jobTitleRowSchema.parse(row));
  const titlesByCode = Map.groupBy(jobTitles, (row) => row['O*NET-SOC Code']);
  const crosswalkByCode = Map.groupBy(crosswalk, (row) => row['O*NET Id']);
  const rows = input.occupations.map((record) => occupationRowSchema.parse(record));
  const codes = new Set(rows.map((row) => row['O*NET-SOC Code']));

  let unresolvedCrosswalkRows = 0;
  const occupations = rows.map((row): RegionalOccupation => {
    const code = row['O*NET-SOC Code'];
    const links = linksFrom(crosswalkByCode.get(code) ?? [], input.iscoByEscoUri);
    unresolvedCrosswalkRows += links.unresolvedRows;
    const description = collapseWhitespace(row.Description);
    return {
      code,
      title: collapseWhitespace(row.Title),
      ...(description === '' ? {} : { description }),
      iscoLinks: links.ordered,
      titles: distinctTitles(
        (titlesByCode.get(code) ?? []).map((title) => ({
          text: collapseWhitespace(title['Job Title']),
          language: 'en',
        })),
      ),
    };
  });

  return {
    classification: {
      region: 'us',
      scheme: {
        name: 'O*NET-SOC',
        version: ONET_DATABASE.version,
        publisher: ONET_DATABASE.publisher,
      },
      languages: ['en'],
      occupations: occupations.toSorted((a, b) => compareCodes(a.code, b.code)),
    },
    unresolvedCrosswalkRows,
    orphanCrosswalkRows: crosswalk.filter((row) => !codes.has(row['O*NET Id'])).length,
  };
}

function linksFrom(
  rows: readonly CrosswalkRow[],
  iscoByEscoUri: ReadonlyMap<string, string>,
): { ordered: IscoLink[]; unresolvedRows: number } {
  const links = new Map<string, IscoLink>();
  let unresolvedRows = 0;
  for (const row of rows) {
    const isco08 = unitGroupOf(row['ESCO or ISCO URI'], iscoByEscoUri);
    if (isco08 === undefined) {
      unresolvedRows += 1;
      continue;
    }
    const basis = BASIS_BY_MATCH[row['Type of Match']];
    const known = links.get(isco08);
    links.set(isco08, {
      isco08,
      basis: known === undefined ? basis : strongerOf(known.basis, basis),
      support: (known?.support ?? 0) + 1,
    });
  }
  return { ordered: [...links.values()].toSorted(byPreference), unresolvedRows };
}

function unitGroupOf(uri: string, iscoByEscoUri: ReadonlyMap<string, string>): string | undefined {
  const iscoGroup = ISCO_URI.exec(uri)?.[1];
  if (iscoGroup !== undefined) {
    // Broader ISCO groups cannot be scored: only unit groups carry tasks.
    return iscoGroup.length === 4 ? iscoGroup : undefined;
  }
  return iscoByEscoUri.get(uri);
}

function strongerOf(a: IscoLinkBasis, b: IscoLinkBasis): IscoLinkBasis {
  return BASIS_PREFERENCE.indexOf(a) <= BASIS_PREFERENCE.indexOf(b) ? a : b;
}

function byPreference(a: IscoLink, b: IscoLink): number {
  return (
    BASIS_PREFERENCE.indexOf(a.basis) - BASIS_PREFERENCE.indexOf(b.basis) ||
    b.support - a.support ||
    compareCodes(a.isco08, b.isco08)
  );
}
