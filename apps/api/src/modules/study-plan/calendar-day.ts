/*
 * Days of the calendar as `YYYY-MM-DD`, with no time and no zone. In this form they sort
 * and compare as text.
 */

const DAY_LENGTH = 'YYYY-MM-DD'.length;

/** The day an instant falls on, in UTC. */
export function dayOf(instant: Date): string {
  return instant.toISOString().slice(0, DAY_LENGTH);
}

/** The day a number of days after another. */
export function addDays(day: string, days: number): string {
  const instant = new Date(`${day}T00:00:00.000Z`);
  instant.setUTCDate(instant.getUTCDate() + days);
  return dayOf(instant);
}

/** The later of two days. */
export function laterOf(first: string, second: string): string {
  return first > second ? first : second;
}

/**
 * The day it is for a reader. Their own word is taken when it is within a day of the
 * server's, which is as far apart as two time zones are; otherwise the server's day counts.
 */
export function readerDay(serverDay: string, claimed: string | undefined): string {
  if (claimed === undefined) {
    return serverDay;
  }
  const withinADay = claimed >= addDays(serverDay, -1) && claimed <= addDays(serverDay, 1);
  return withinADay ? claimed : serverDay;
}
