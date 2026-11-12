/** From this many minutes on, a reading time reads better in hours. */
const HOURS_FROM_MINUTES = 90;

/** A reading time as a reader says it: minutes for a short read, whole hours for a long one. */
export function durationOf(minutes: number): {
  readonly unit: 'minutes' | 'hours';
  readonly value: number;
} {
  return minutes < HOURS_FROM_MINUTES
    ? { unit: 'minutes', value: minutes }
    : { unit: 'hours', value: Math.round(minutes / 60) };
}
