import type { PlannedCourse } from '@rewire/contracts';

import { formatDate } from '../../i18n/format.ts';
import type { Messages } from '../../i18n/use-messages.ts';

import { toLocalDate } from './calendar.ts';
import { isCompleted } from './gantt-data.ts';
import { heldSentence, paymentAction, paymentStatus, type PaidCourse } from './payment.ts';

/** The days of a booking in short, as the language writes a range: "Nov 17 – 23". */
export function shortRange(
  firstDay: string,
  lastDay: string,
  language: Messages['language'],
): string {
  const format = new Intl.DateTimeFormat(language, { day: 'numeric', month: 'short' });
  return format.formatRange(toLocalDate(firstDay), toLocalDate(lastDay));
}

/** How far a paid course is done, or that it is completed; nothing for a free one. */
export function progressText(
  { t, language }: Pick<Messages, 't' | 'language'>,
  course: PlannedCourse,
): string | null {
  if (course.kind === 'free') {
    return null;
  }
  if (isCompleted(course)) {
    return t('timeline.tip.completed');
  }
  const percent = new Intl.NumberFormat(language, { style: 'percent' }).format(course.progress);
  return t('timeline.tip.progress', { percent });
}

/** What the tooltip says about a course: its days, its length, whether it moved, its progress. */
export function courseLines(
  { t, language }: Pick<Messages, 't' | 'language'>,
  course: PlannedCourse,
): string[] {
  const lines: string[] = [];
  if (course.booking !== null) {
    const start = formatDate(course.booking.startsOn, language);
    const end = formatDate(course.booking.endsOn, language);
    lines.push(t('timeline.tip.dates', { start, end }));
  }
  const hours = new Intl.NumberFormat(language).format(course.hours ?? 0);
  lines.push(
    course.hours === null ? t('timeline.tip.noLength') : t('timeline.tip.hours', { hours }),
  );
  if (course.booking?.moved === true) {
    lines.push(t('timeline.tip.moved'));
  }
  lines.push(course.kind === 'free' ? t('timeline.tip.free') : t('timeline.tip.paid'));
  const held = heldSentence({ t, language }, course);
  const payment = course.kind === 'paid' ? paymentStatus({ t, language }, course) : null;
  const progress = progressText({ t, language }, course);
  return [...lines, held, payment, progress].filter((line) => line !== null);
}

/** What the tooltip says about a payment: where it stands, what it holds, what to do. */
export function paymentLines(
  words: Pick<Messages, 't' | 'language'>,
  course: PaidCourse,
): string[] {
  return [
    paymentStatus(words, course),
    heldSentence(words, course),
    `${paymentAction(words, course)}: ${course.title}`,
  ].filter((line) => line !== null);
}
