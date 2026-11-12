import {
  timeShareSchema,
  type ExposureReport,
  type ExposureTask,
  type PersonalExposure,
  type TaskBand,
  type TimeShare,
} from '@rewire/contracts';

import { BANDS_HIGH_FIRST } from './bands.ts';
import type { TimeByTask } from './times.ts';

type ScoreRange = ExposureTask['range'];

/** A task of the report, with the time the person gives it. */
export interface TaskLine {
  readonly kind: 'task';
  readonly id: string;
  readonly text: string;
  readonly score: number;
  readonly band: TaskBand;
  readonly range: ScoreRange;
  readonly reviewed: boolean;
  /** A task left out takes `some`, as in the list. */
  readonly share: TimeShare;
}

/** The person's week, pinned at the foot: a figure and its range, `null` with no time given. */
export interface WeekLine {
  readonly kind: 'week';
  readonly id: string;
  readonly text: string;
  readonly score: number | null;
  readonly range: ScoreRange | null;
}

/** A line of the task table. */
export type TaskRow = TaskLine | WeekLine;

const WEEK_ROW_ID = 'your-week';

/** The tasks of the report as rows, with the time the person gave each. */
export function taskRows(report: ExposureReport, timeByTask: TimeByTask): readonly TaskLine[] {
  return report.tasks.map((task) => ({
    kind: 'task',
    id: task.id,
    text: task.text,
    score: task.score,
    band: task.band,
    range: task.range,
    reviewed: task.reviewedByExperts,
    share: timeByTask[task.id] ?? 'some',
  }));
}

/** The person's week, as the figure above the table says it. */
export function weekRow(label: string, personal: PersonalExposure): WeekLine {
  return {
    kind: 'week',
    id: WEEK_ROW_ID,
    text: label,
    score: personal.score,
    range: personal.range,
  };
}

/** The task of a row, or `undefined` for the week. */
export const taskOf = (row: TaskRow | undefined): TaskLine | undefined =>
  row?.kind === 'task' ? row : undefined;

/** Orders by a fixed list, so a column sorts by meaning and not by its words. */
function byOrder<T>(order: readonly T[]) {
  return (left: T | null, right: T | null): number =>
    (left === null ? order.length : order.indexOf(left)) -
    (right === null ? order.length : order.indexOf(right));
}

/** Low to high exposure, so an ascending sort puts the least exposed band first. */
export const compareBands = byOrder<TaskBand>([...BANDS_HIGH_FIRST].reverse());

/** Little to most time, so an ascending sort puts the tasks that take least time first. */
export const compareShares = byOrder<TimeShare>([...timeShareSchema.options].reverse());
