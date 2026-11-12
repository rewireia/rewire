import type { ExposureDataset, ExposureGradient, ScoredOccupation, ScoredTask } from '@rewire/data';

import { compareCodes } from '../text/compare-codes.ts';

import { TASK_BANDS, taskBandOf, type TaskBand } from './bands.ts';
import { standingOf, type Standing } from './standing.ts';

/**
 * The range of a task: the lowest and the highest of the two model predictions and the published score. It
 * shows how much the models disagreed and is not a confidence interval.
 */
export interface ScoreRange {
  readonly low: number;
  readonly high: number;
}

export interface ProfiledTask {
  readonly id: string;
  readonly text: string;
  readonly score: number;
  readonly band: TaskBand;
  /**
   * The lowest and the highest of the two model predictions and the published score. It
   * shows how much the models disagreed and is not a confidence interval.
   */
  readonly range: ScoreRange;
  /** True when the authors set the score after expert review. */
  readonly reviewedByExperts: boolean;
}

/** What the ILO index says about one unit group, ready to explain to a person. */
export interface ExposureProfile {
  readonly isco08: string;
  readonly title: string;
  readonly majorGroup: { readonly code: string; readonly title: string };
  readonly meanScore: number;
  readonly standardDeviation: number;
  readonly gradient: ExposureGradient;
  /** Most exposed task first. */
  readonly tasks: readonly ProfiledTask[];
  readonly tasksByBand: Readonly<Record<TaskBand, number>>;
  readonly standing: Standing;
}

/**
 * Builds the exposure profile of an ISCO-08 unit group.
 *
 * Returns `undefined` for the few unit groups the ILO has not scored.
 */
export function exposureProfileOf(
  dataset: ExposureDataset,
  isco08: string,
): ExposureProfile | undefined {
  const occupation = dataset.occupations.find((candidate) => candidate.isco08 === isco08);
  return occupation === undefined ? undefined : profileOf(dataset, occupation);
}

/**
 * The major group of a scored unit group, with its title.
 *
 * The bundle schema requires every major group a unit group names to be in the dataset, so
 * a missing one means the dataset was not checked against it.
 */
export function majorGroupOf(
  dataset: ExposureDataset,
  occupation: ScoredOccupation,
): { readonly code: string; readonly title: string } {
  const group = dataset.majorGroups.find((candidate) => candidate.code === occupation.majorGroup);
  if (group === undefined) {
    throw new Error(
      `Unit group ${occupation.isco08} belongs to major group ${occupation.majorGroup}, which the exposure dataset does not name.`,
    );
  }
  return { code: group.code, title: group.title };
}

function profileOf(dataset: ExposureDataset, occupation: ScoredOccupation): ExposureProfile {
  const tasks = occupation.tasks.map(profiledTaskOf).toSorted(byExposureThenPosition);
  return {
    isco08: occupation.isco08,
    title: occupation.title,
    majorGroup: majorGroupOf(dataset, occupation),
    meanScore: occupation.meanScore,
    standardDeviation: occupation.standardDeviation,
    gradient: occupation.gradient,
    tasks,
    tasksByBand: countByBand(tasks),
    standing: standingOf(dataset, occupation.meanScore),
  };
}

function profiledTaskOf(task: ScoredTask): ProfiledTask {
  const values = [task.score, task.modelScores.gpt4o, task.modelScores.gemini].filter(
    (value) => value !== null,
  );
  return {
    id: task.id,
    text: task.text,
    score: task.score,
    band: taskBandOf(task.score),
    // A reviewed score can fall outside the two predictions, so it is part of the range.
    range: { low: Math.min(...values), high: Math.max(...values) },
    reviewedByExperts: task.origin === 'reconciled',
  };
}

/** Most exposed first; equal scores keep the order of the tasks in the unit group. */
function byExposureThenPosition(a: ProfiledTask, b: ProfiledTask): number {
  return b.score - a.score || taskNumberOf(a.id) - taskNumberOf(b.id) || compareCodes(a.id, b.id);
}

/** Position of a task within its unit group: the number after the hyphen, as in `2512-3`. */
function taskNumberOf(id: string): number {
  return Number(id.slice(id.indexOf('-') + 1));
}

function countByBand(tasks: readonly ProfiledTask[]): Record<TaskBand, number> {
  const counts: Record<TaskBand, number> = { high: 0, medium: 0, low: 0, 'very-low': 0 };
  for (const band of TASK_BANDS) {
    counts[band] = tasks.filter((task) => task.band === band).length;
  }
  return counts;
}
