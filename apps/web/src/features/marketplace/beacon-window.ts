import { BEACON_MAXIMUM_HOURS } from '@rewire/contracts';

const HOUR = 3_600_000;

export type EndShortcut = 'one-hour' | 'three-hours' | 'midnight';

const twoDigits = (value: number) => String(value).padStart(2, '0');

/** A date as a `datetime-local` field holds it: the browser's own time, to the minute. */
export function localInputOf(date: Date): string {
  return [
    `${date.getFullYear()}-${twoDigits(date.getMonth() + 1)}-${twoDigits(date.getDate())}`,
    `T${twoDigits(date.getHours())}:${twoDigits(date.getMinutes())}`,
  ].join('');
}

/** The instant a `datetime-local` field names, in the browser's time; null when empty or wrong. */
export function dateOfLocalInput(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** The end a shortcut gives from a start: an hour, three, or the next midnight. */
export function endOf(start: Date, shortcut: EndShortcut): Date {
  if (shortcut === 'one-hour') return new Date(start.getTime() + HOUR);
  if (shortcut === 'three-hours') return new Date(start.getTime() + 3 * HOUR);
  const midnight = new Date(start);
  midnight.setHours(24, 0, 0, 0);
  return midnight;
}

/** Whether a window may be asked for: it ends after it starts, in the future, within a week. */
export function validWindow(start: Date, end: Date, now: Date): boolean {
  const from = Math.max(start.getTime(), now.getTime());
  return end.getTime() > from && end.getTime() - from <= BEACON_MAXIMUM_HOURS * HOUR;
}
