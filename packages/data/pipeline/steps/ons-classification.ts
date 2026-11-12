import { z } from 'zod';

import type {
  IscoLink,
  JobTitle,
  RegionalClassification,
  RegionalOccupation,
} from '../../src/index.ts';
import type { SheetRecord } from '../readers/spreadsheet.ts';
import { ONS_CODING_INDEX } from '../sources.ts';

import { codeCellSchema } from './code-cell.ts';
import { compareCodes } from './compare-codes.ts';
import { collapseWhitespace, distinctTitles } from './titles.ts';

/** Sheets of the ONS workbook the step reads. */
export const ONS_SHEETS = {
  index: 'SOC2020 coding index',
  framework: 'SOC2020 framework',
} as const;

const UNIT_GROUP = /^\d{4}$/;

/** One job title of the coding index. Uncodable entries carry "}}}}" instead of a code. */
const indexRowSchema = z.object({
  SOC_2020: codeCellSchema,
  ADD: z.string().nullable(),
  IND: z.string().nullable(),
  'ISCO-08 code based on SOC2020': codeCellSchema.nullable(),
  'INDEXOCC_-_natural_word_order': z.coerce.string().nullable(),
});

/** One line of the framework sheet; only unit-group lines carry a unit group code. */
const frameworkRowSchema = z.object({
  'SOC2020 Unit Group': z.coerce.string().nullable(),
  'SOC2020 Group Title': z.string().nullable(),
});

export interface OnsStepInput {
  readonly index: readonly SheetRecord[];
  readonly framework: readonly SheetRecord[];
}

/**
 * Turns the ONS coding index into the UK classification.
 *
 * The index codes every job title to ISCO-08 on its own, so a title keeps its code. The
 * unit group itself is linked to the codes of its titles, most frequent first.
 */
export function buildUkClassification(input: OnsStepInput): RegionalClassification {
  const titlesByUnitGroup = Map.groupBy(
    input.index.flatMap(toCodedTitle),
    (entry) => entry.unitGroup,
  );
  const occupations = input.framework.flatMap((record): RegionalOccupation[] => {
    const row = frameworkRowSchema.parse(record);
    const code = row['SOC2020 Unit Group'];
    const title = row['SOC2020 Group Title'];
    if (code === null || title === null || !UNIT_GROUP.test(code)) {
      return [];
    }
    const titles = distinctTitles((titlesByUnitGroup.get(code) ?? []).map((entry) => entry.title));
    return [{ code, title: collapseWhitespace(title), iscoLinks: linksFrom(titles), titles }];
  });

  return {
    region: 'uk',
    scheme: {
      name: 'SOC 2020',
      version: ONS_CODING_INDEX.version,
      publisher: ONS_CODING_INDEX.publisher,
    },
    languages: ['en'],
    occupations: occupations.toSorted((a, b) => compareCodes(a.code, b.code)),
  };
}

function toCodedTitle(record: SheetRecord): { unitGroup: string; title: JobTitle }[] {
  const row = indexRowSchema.parse(record);
  const text = row['INDEXOCC_-_natural_word_order'];
  if (text === null || !UNIT_GROUP.test(row.SOC_2020)) {
    return [];
  }
  const isco08 = row['ISCO-08 code based on SOC2020'];
  const qualifier = [row.ADD, row.IND]
    .filter((part) => part !== null)
    .map(collapseWhitespace)
    .join(', ');
  return [
    {
      unitGroup: row.SOC_2020,
      title: {
        text: collapseWhitespace(text),
        language: 'en',
        ...(qualifier === '' ? {} : { qualifier }),
        ...(isco08 !== null && UNIT_GROUP.test(isco08) ? { isco08 } : {}),
      },
    },
  ];
}

function linksFrom(titles: readonly JobTitle[]): IscoLink[] {
  const support = new Map<string, number>();
  for (const { isco08 } of titles) {
    if (isco08 !== undefined) {
      support.set(isco08, (support.get(isco08) ?? 0) + 1);
    }
  }
  return [...support]
    .map(([isco08, count]): IscoLink => ({ isco08, basis: 'title-majority', support: count }))
    .toSorted((a, b) => b.support - a.support || compareCodes(a.isco08, b.isco08));
}
