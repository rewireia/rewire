import type { StudyTimeline } from '@rewire/contracts';

import { addDays } from './calendar.ts';

/** The texts of the calendar file, in the language of the interface. */
export interface IcsWords {
  /** Said on every event: where it comes from. */
  readonly note: string;
}

/** iCalendar lines end with CRLF and are folded to at most 75 octets. */
const LINE_END = '\r\n';
const MAX_OCTETS = 75;

/** Escapes a text value: backslash, semicolon, comma and line breaks. */
export function icsText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

/** Folds a line longer than 75 octets: the rest goes on lines that start with a space. */
export function foldLine(line: string): string {
  const encoder = new TextEncoder();
  const parts: string[] = [];
  let current = '';
  for (const character of line) {
    const limit = parts.length === 0 ? MAX_OCTETS : MAX_OCTETS - 1;
    if (encoder.encode(current + character).length > limit) {
      parts.push(current);
      current = '';
    }
    current += character;
  }
  parts.push(current);
  return parts.join(`${LINE_END} `);
}

const icsDate = (day: string) => day.replaceAll('-', '');

/** `20261111T083000Z`: the moment the file is made, in UTC. */
const icsStamp = (now: Date) => `${now.toISOString().replace(/[-:]/g, '').slice(0, 15)}Z`;

/**
 * The plan in time as an iCalendar file: one all-day event per course in the plan, from its
 * first day to its last (the end of an all-day event is the day after it).
 */
export function planCalendar(timeline: StudyTimeline, words: IcsWords, now: Date): string {
  const events = timeline.stages
    .flatMap((stage) => stage.courses)
    .flatMap((course) =>
      course.booking === null
        ? []
        : [
            'BEGIN:VEVENT',
            `UID:${course.id}.${timeline.isco08}.${timeline.region}@rewire`,
            `DTSTAMP:${icsStamp(now)}`,
            `DTSTART;VALUE=DATE:${icsDate(course.booking.startsOn)}`,
            `DTEND;VALUE=DATE:${icsDate(addDays(course.booking.endsOn, 1))}`,
            `SUMMARY:${icsText(course.title)}`,
            `DESCRIPTION:${icsText(words.note)}`,
            'TRANSP:TRANSPARENT',
            'END:VEVENT',
          ],
    );
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Rewire//Plan in time//EN',
    'CALSCALE:GREGORIAN',
    ...events,
    'END:VCALENDAR',
  ];
  return lines.map(foldLine).join(LINE_END) + LINE_END;
}
