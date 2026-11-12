/**
 * Calendar days written as `YYYY-MM-DD`, turned into local dates and back. A day is never
 * parsed with `new Date('YYYY-MM-DD')`, which reads it as midnight in UTC and can land on the
 * day before in the person's time zone.
 */

const DAY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const MS_PER_DAY = 86_400_000;

/** Local midnight at the start of a day written as `YYYY-MM-DD`. */
export function toLocalDate(day: string): Date {
  const match = DAY_PATTERN.exec(day);
  if (match === null) {
    throw new RangeError(`Expected a day written as YYYY-MM-DD, got "${day}".`);
  }
  const [, year, month, date] = match;
  return new Date(Number(year), Number(month) - 1, Number(date));
}

/** The local day a date falls on, written as `YYYY-MM-DD`. */
export function toDay(date: Date): string {
  const year = String(date.getFullYear()).padStart(4, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** The day `count` days after another one (before it when negative). */
export function addDays(day: string, count: number): string {
  const date = toLocalDate(day);
  date.setDate(date.getDate() + count);
  return toDay(date);
}

/** Whole days from one day to another, counted on the calendar whatever the clock changes. */
function daysBetween(from: string, to: string): number {
  const start = toLocalDate(from);
  const end = toLocalDate(to);
  const utcStart = Date.UTC(start.getFullYear(), start.getMonth(), start.getDate());
  const utcEnd = Date.UTC(end.getFullYear(), end.getMonth(), end.getDate());
  return Math.round((utcEnd - utcStart) / MS_PER_DAY);
}

/**
 * The end of a booking for the chart. Rewire names the last day a course takes; the chart
 * ends a task at the moment it is over, the next day at midnight.
 */
export function chartEnd(lastDay: string): Date {
  return toLocalDate(addDays(lastDay, 1));
}

/**
 * The last day a task of the chart takes, from the moment it ends. A task that ends at
 * midnight is over the day before; one that ends during a day still takes that day.
 */
export function lastDayOf(end: Date): string {
  const day = toDay(end);
  const atMidnight =
    end.getHours() === 0 &&
    end.getMinutes() === 0 &&
    end.getSeconds() === 0 &&
    end.getMilliseconds() === 0;
  return atMidnight ? addDays(day, -1) : day;
}

/** Days a booking takes, its first and its last included. */
export function daysTaken(firstDay: string, lastDay: string): number {
  return daysBetween(firstDay, lastDay) + 1;
}
