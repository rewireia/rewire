import { daysTaken, toDay } from './calendar.ts';

/** The width of a day on the chart: wide enough to read a short course, never sprawling. */
const DAY_WIDTH = { min: 2, max: 28 } as const;
const DAYS_PER_WEEK = 7;

/**
 * How the time axis is scaled: the whole plan fitted to the width, or a fixed width of a day
 * that reads week by week or month by month, scrolling sideways when the plan is longer.
 */
export type ChartScale = 'fit' | 'weeks' | 'months';

/** The width of a day in the two fixed scales. */
const FIXED_DAY: Record<Exclude<ChartScale, 'fit'>, number> = { weeks: 24, months: 7 };

/** The width of a week on the time axis, as the scale asks. */
export function weekWidth(scale: ChartScale, room: number, startDate: Date, endDate: Date): number {
  if (scale !== 'fit') {
    return FIXED_DAY[scale] * DAYS_PER_WEEK;
  }
  // The axis starts at the beginning of a week and ends at the end of one: one more week at most.
  const weeks = Math.ceil(daysTaken(toDay(startDate), toDay(endDate)) / DAYS_PER_WEEK) + 1;
  const fitted = Math.floor(room / weeks);
  return Math.min(DAY_WIDTH.max * DAYS_PER_WEEK, Math.max(DAY_WIDTH.min * DAYS_PER_WEEK, fitted));
}
