import { apportion } from './apportion.ts';
import { TASK_BANDS, type TaskBand } from './bands.ts';
import type { ExposureProfile, ProfiledTask, ScoreRange } from './profile.ts';

/** How much of the working week a person says a task takes. */
export type TimeShare = 'most' | 'some' | 'little' | 'none';

/** Weight of each answer when the tasks of a week are averaged. */
const WEIGHT_BY_TIME_SHARE: Readonly<Record<TimeShare, number>> = {
  most: 3,
  some: 2,
  little: 1,
  none: 0,
};

/** A task the person has not rated counts as an ordinary part of the job. */
const UNRATED: TimeShare = 'some';

const WEEK_POINTS = 100;
const WEEK_STEP = 5;

/** The exposure of one person's version of an occupation: the tasks they really do. */
export interface PersonalExposure {
  /** Time-weighted mean of the task scores; `null` when no task takes any time. */
  readonly score: number | null;
  /** The same mean over the low and the high end of each task's range. */
  readonly range: ScoreRange | null;
  /** Points out of 100 of the week spent on tasks of each band, in steps of 5. */
  readonly weekByBand: Readonly<Record<TaskBand, number>>;
  /** Tasks that take some of the person's time. */
  readonly tasksCounted: number;
}

/**
 * Weighs the task scores of a profile by the time a person gives to each task.
 *
 * With no answers, every task weighs the same and the score is the plain mean of the
 * task scores.
 */
export function personalExposureOf(
  profile: ExposureProfile,
  timeByTask: ReadonlyMap<string, TimeShare> = new Map(),
): PersonalExposure {
  const weighted = profile.tasks
    .map((task) => ({ task, weight: WEIGHT_BY_TIME_SHARE[timeByTask.get(task.id) ?? UNRATED] }))
    .filter(({ weight }) => weight > 0);
  const totalWeight = weighted.reduce((sum, { weight }) => sum + weight, 0);
  const mean = (valueOf: (task: ProfiledTask) => number) =>
    weighted.reduce((sum, { task, weight }) => sum + weight * valueOf(task), 0) / totalWeight;

  const weightByBand = TASK_BANDS.map((band) =>
    weighted.reduce((sum, { task, weight }) => sum + (task.band === band ? weight : 0), 0),
  );
  const weekPoints = apportion(weightByBand, WEEK_POINTS, WEEK_STEP);
  const weekByBand: Record<TaskBand, number> = { high: 0, medium: 0, low: 0, 'very-low': 0 };
  TASK_BANDS.forEach((band, position) => {
    weekByBand[band] = weekPoints[position] ?? 0;
  });

  const hasTasks = totalWeight > 0;
  return {
    score: hasTasks ? mean((task) => task.score) : null,
    range: hasTasks
      ? { low: mean((task) => task.range.low), high: mean((task) => task.range.high) }
      : null,
    weekByBand,
    tasksCounted: weighted.length,
  };
}
