import { z } from 'zod';

import type {
  ExposureDataset,
  ExposureGradient,
  ScoredOccupation,
  ScoredTask,
  TaskRationales,
} from '../../src/index.ts';
import type { SheetRecord } from '../readers/spreadsheet.ts';

import { codeCellSchema } from './code-cell.ts';
import { compareCodes } from './compare-codes.ts';

/** The unit group categories as the ILO spells them in its `potential25` column. */
const GRADIENT_LABELS = [
  'Exposed: Gradient 4',
  'Exposed: Gradient 3',
  'Exposed: Gradient 2',
  'Exposed: Gradient 1',
  'Minimal Exposure',
  'Not Exposed',
] as const;

const GRADIENT_BY_LABEL = {
  'Exposed: Gradient 4': 'gradient-4',
  'Exposed: Gradient 3': 'gradient-3',
  'Exposed: Gradient 2': 'gradient-2',
  'Exposed: Gradient 1': 'gradient-1',
  'Minimal Exposure': 'minimal',
  'Not Exposed': 'not-exposed',
} as const satisfies Record<(typeof GRADIENT_LABELS)[number], ExposureGradient>;

const scoreSchema = z.number().min(0).max(1);

/** One row of the ILO workbook: one task of one unit group. */
const taskRowSchema = z.object({
  ISCO_08: codeCellSchema.pipe(z.string().regex(/^\d{4}$/)),
  Title: z.string().min(1),
  label1d: z.string().regex(/^\d - .+$/),
  taskID: z.number().int().positive(),
  Task_ISCO: z.string().min(1),
  predicted_score_2025_gpt4o: scoreSchema.nullable(),
  prediction_justification_gpt4o: z.string().nullable(),
  predicted_score_2025_gemini: scoreSchema.nullable(),
  prediction_justification_gemini: z.string().nullable(),
  score_2025: scoreSchema,
  source: z.enum(['predicted', 'reconciled']),
  mean_score_2025: scoreSchema,
  SD_2025: z.number().min(0),
  potential25: z.enum(GRADIENT_LABELS),
});

type TaskRow = z.infer<typeof taskRowSchema>;

/** Columns that describe the unit group, repeated on every one of its task rows. */
const UNIT_GROUP_COLUMNS = ['Title', 'mean_score_2025', 'SD_2025', 'potential25'] as const;

export interface ExposureStepResult {
  readonly dataset: ExposureDataset;
  readonly rationales: TaskRationales;
}

/** Turns the rows of the ILO workbook into scored unit groups with their tasks. */
export function buildExposure(records: readonly SheetRecord[]): ExposureStepResult {
  const rows = records.map((record) => taskRowSchema.parse(record));
  const rowsByOccupation = Map.groupBy(rows, (row) => row.ISCO_08);

  const occupations = [...rowsByOccupation.values()].map(toOccupation);
  const rationales: TaskRationales = Object.fromEntries(
    rows.map((row) => [
      taskId(row),
      { gpt4o: row.prediction_justification_gpt4o, gemini: row.prediction_justification_gemini },
    ]),
  );
  return { dataset: { majorGroups: majorGroupsOf(rows), occupations }, rationales };
}

function toOccupation(rows: readonly TaskRow[]): ScoredOccupation {
  const first = rows[0];
  if (first === undefined) {
    throw new Error('a unit group needs at least one task row');
  }
  requireSameUnitGroupColumns(rows, first);
  return {
    isco08: first.ISCO_08,
    title: first.Title.trim(),
    majorGroup: first.ISCO_08.charAt(0),
    meanScore: first.mean_score_2025,
    standardDeviation: first.SD_2025,
    gradient: GRADIENT_BY_LABEL[first.potential25],
    tasks: rows.toSorted((a, b) => a.taskID - b.taskID).map(toTask),
  };
}

/** Every task row of a unit group must describe the unit group the way its first row does. */
function requireSameUnitGroupColumns(rows: readonly TaskRow[], first: TaskRow): void {
  for (const row of rows) {
    for (const column of UNIT_GROUP_COLUMNS) {
      if (row[column] !== first[column]) {
        throw new Error(
          `unit group ${first.ISCO_08} has task rows that disagree on ${column}: ${String(first[column])} and ${String(row[column])}`,
        );
      }
    }
  }
}

function toTask(row: TaskRow): ScoredTask {
  return {
    id: taskId(row),
    text: row.Task_ISCO.trim(),
    score: row.score_2025,
    modelScores: {
      gpt4o: row.predicted_score_2025_gpt4o,
      gemini: row.predicted_score_2025_gemini,
    },
    origin: row.source,
  };
}

function taskId(row: TaskRow): string {
  return `${row.ISCO_08}-${row.taskID}`;
}

function majorGroupsOf(rows: readonly TaskRow[]): ExposureDataset['majorGroups'] {
  const titles = new Map<string, string>();
  for (const row of rows) {
    const [code = '', title = ''] = row.label1d.split(' - ', 2);
    titles.set(code, title.trim());
  }
  return [...titles]
    .map(([code, title]) => ({ code, title }))
    .toSorted((a, b) => compareCodes(a.code, b.code));
}
