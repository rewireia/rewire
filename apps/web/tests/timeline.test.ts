import { describe, expect, it } from 'vitest';

import {
  addDays,
  chartEnd,
  daysTaken,
  lastDayOf,
  toDay,
  toLocalDate,
} from '../src/features/timeline/calendar.ts';
import { courseLines, progressText, shortRange } from '../src/features/timeline/course-lines.ts';
import { courseHref, planDependencies, toGanttData } from '../src/features/timeline/gantt-data.ts';
import { weekWidth } from '../src/features/timeline/gantt-scale.ts';
import {
  hasChanges,
  isBookable,
  isPlanDay,
  movedTo,
  paceOptions,
  reset,
  stretchedTo,
  withBookedDays,
  withCourse,
  withNotBefore,
} from '../src/features/timeline/plan-changes.ts';
import { planSummary } from '../src/features/timeline/summary.ts';
import { translate, type MessageValues } from '../src/i18n/format.ts';
import type { MessageKey } from '../src/i18n/en.ts';

import { booking, chartNames, course, paid, PLAN, timeline } from './timeline-plan.ts';

const t = (key: MessageKey, values?: MessageValues) => translate('en', key, values);
const tEs = (key: MessageKey, values?: MessageValues) => translate('es', key, values);

describe('calendar days', () => {
  it('reads a day as local midnight and writes it back', () => {
    const date = toLocalDate('2026-03-29');
    expect([date.getFullYear(), date.getMonth(), date.getDate(), date.getHours()]).toEqual([
      2026, 2, 29, 0,
    ]);
    expect(toDay(date)).toBe('2026-03-29');
  });

  it('refuses anything that is not a day', () => {
    expect(() => toLocalDate('2026-3-9')).toThrow(RangeError);
  });

  it('counts days across a month, a year and a clock change', () => {
    expect(addDays('2026-12-30', 3)).toBe('2027-01-02');
    expect(addDays('2026-03-28', 2)).toBe('2026-03-30');
    expect(daysTaken('2026-11-11', '2026-11-17')).toBe(7);
  });

  it('turns the last day of a booking into the moment the chart ends it, and back', () => {
    const end = chartEnd('2026-11-17');
    expect(toDay(end)).toBe('2026-11-18');
    expect(end.getHours()).toBe(0);
    expect(lastDayOf(end)).toBe('2026-11-17');
    expect(lastDayOf(chartEnd('2026-12-31'))).toBe('2026-12-31');
  });

  it('keeps a day an end during the day still takes', () => {
    expect(lastDayOf(new Date(2026, 10, 18, 12))).toBe('2026-11-18');
  });
});

describe('the chart of a plan', () => {
  const data = toGanttData(timeline(), chartNames);

  it('has a row per stage with its courses, placed on their days', () => {
    expect(data.tasks.map((task) => task.name)).toEqual(['Understand', 'Apply', 'You finish here']);
    const [first] = data.tasks[0]?.children ?? [];
    expect(first?.startDate).toEqual(new Date(2026, 10, 11));
    expect(first?.endDate).toEqual(new Date(2026, 10, 18));
    expect(first?.manuallyScheduled).toBe(true);
  });

  it('spans a stage over its courses in the plan, and never lets it move', () => {
    const apply = data.tasks[1];
    expect(apply?.startDate).toEqual(new Date(2026, 10, 25));
    expect(apply?.endDate).toEqual(new Date(2026, 10, 29));
    expect([apply?.draggable, apply?.resizable]).toEqual([false, false]);
  });

  it('stretches only a placed course whose length is not published', () => {
    const [a, b] = data.tasks[0]?.children ?? [];
    const [c, , d] = data.tasks[1]?.children ?? [];
    expect([a?.resizable, b?.resizable, c?.resizable, d?.resizable]).toEqual([
      'end',
      'end',
      false,
      false,
    ]);
  });

  it('keeps a course out of the plan as a row with no days', () => {
    const c = data.tasks[1]?.children?.[0];
    expect(c?.inPlan).toBe(false);
    expect(c?.startDate).toBeUndefined();
    expect(c?.draggable).toBe(false);
  });

  it('marks a paid course, a moved one and a completed one', () => {
    const [, b] = data.tasks[0]?.children ?? [];
    expect(b?.cls).toBe('rewire-free rewire-stage-understand rewire-moved');
    const done = toGanttData(
      timeline({ stages: [{ stage: 'apply', courses: [paid('x', { progress: 1 })] }] }),
      chartNames,
    );
    expect(done.tasks[0]?.children?.[1]?.cls).toBe(
      'rewire-paid rewire-stage-understand rewire-done',
    );
  });

  it('draws arrows between consecutive courses, from a payment and to the end', () => {
    expect(planDependencies(timeline())).toEqual([
      { id: 'a>b', fromTask: 'a', toTask: 'b' },
      { id: 'b>d', fromTask: 'b', toTask: 'd' },
      { id: 'pay-d>d', fromTask: 'pay-d', toTask: 'd' },
      { id: 'd>finish', fromTask: 'd', toTask: 'finish' },
    ]);
  });

  it('shows the plan from its first day to two weeks after its last', () => {
    expect(toDay(data.startDate)).toBe('2026-11-11');
    expect(toDay(data.endDate)).toBe('2026-12-12');
  });

  it('links a paid course to its page and a free one to its provider', () => {
    expect(courseHref('us', paid('d'))).toBe('/us/courses/d');
    expect(courseHref('eu', course('a'))).toBe('https://example.org/a');
  });
});

describe('gestures as changes of the plan', () => {
  it('turns a drop into the day the course may not start before', () => {
    expect(movedTo(PLAN, 'a', new Date(2026, 11, 2)).notBefore).toEqual({ a: '2026-12-02' });
  });

  it('turns a stretch into the days booked, first and last included, within bounds', () => {
    const start = new Date(2026, 10, 11);
    expect(stretchedTo(PLAN, 'a', start, new Date(2026, 10, 25)).bookedDays).toEqual({ a: 14 });
    expect(stretchedTo(PLAN, 'a', start, new Date(2026, 10, 11)).bookedDays).toEqual({ a: 1 });
    expect(stretchedTo(PLAN, 'a', start, new Date(2027, 10, 11)).bookedDays).toEqual({ a: 180 });
  });

  it('leaves a course out and puts it back once', () => {
    const out = withCourse(PLAN, 'a', false);
    expect(out.leftOut).toEqual(['a']);
    expect(withCourse(out, 'a', false).leftOut).toEqual(['a']);
    expect(withCourse(out, 'a', true).leftOut).toEqual([]);
  });

  it('resets what the learner changed, keeping the start and the pace', () => {
    const changed = { ...movedTo(PLAN, 'a', new Date(2026, 11, 2)), hoursPerWeek: 8 };
    expect(hasChanges(PLAN)).toBe(false);
    expect(hasChanges(changed)).toBe(true);
    expect(reset(changed)).toEqual({ ...PLAN, hoursPerWeek: 8 });
  });

  it('sets and clears the day a course may not start before, from the list', () => {
    const moved = withNotBefore(PLAN, 'a', '2026-12-01');
    expect(moved.notBefore).toEqual({ a: '2026-12-01' });
    expect(withNotBefore(moved, 'a', null).notBefore).toEqual({});
  });

  it('books days for a course from the list, within bounds', () => {
    expect(withBookedDays(PLAN, 'a', 10).bookedDays).toEqual({ a: 10 });
    expect(withBookedDays(PLAN, 'a', 400).bookedDays).toEqual({ a: 180 });
  });

  it('accepts only whole days a plan may name, and bookable lengths', () => {
    expect(isPlanDay('2026-12-01')).toBe(true);
    expect(isPlanDay('0002-12-01')).toBe(false);
    expect(isPlanDay('2026-12')).toBe(false);
    expect([isBookable(1), isBookable(180), isBookable(0), isBookable(2.5)]).toEqual([
      true,
      true,
      false,
      false,
    ]);
  });

  it('offers the learner their own pace among the usual ones', () => {
    expect(paceOptions(4)).toEqual([2, 4, 6, 8, 10]);
    expect(paceOptions(3)).toEqual([2, 3, 4, 6, 8, 10]);
  });
});

describe('the sentence of the plan', () => {
  it('says when it ends, the published hours and the courses booked a week', () => {
    expect(planSummary(timeline(), t, 'en')).toEqual({
      headline: 'At 4 hours a week you finish on November 28, 2026.',
      details: [
        'The courses in the plan publish 2 hours in all.',
        '2 courses do not publish their length: Rewire books a week for each until you say.',
      ],
    });
  });

  it('counts only the courses the learner has not booked', () => {
    const plan = { ...PLAN, bookedDays: { a: 10 } };
    expect(planSummary(timeline({ plan }), tEs, 'es').details).toEqual([
      'Los cursos del plan publican 2 horas en total.',
      'Un curso no publica su duración: Rewire le reserva una semana hasta que digas otra cosa.',
    ]);
  });

  it('gives no date when every course is out of the plan', () => {
    const summary = planSummary(timeline({ finishesOn: null }), t, 'en');
    expect(summary.headline).toMatch(/no end date/);
    expect(summary.details).toEqual([]);
  });
});

describe('the scale of the chart', () => {
  const start = new Date(2026, 10, 11);
  const end = new Date(2026, 11, 12);

  it('fills the room beside the table when the plan fits', () => {
    // 32 days: five weeks and one more for the week the axis starts in.
    expect(weekWidth('fit', 720, start, end)).toBe(120);
  });

  it('keeps a day within its bounds when fitting the plan', () => {
    expect(weekWidth('fit', 30, start, end)).toBe(14);
    expect(weekWidth('fit', 4000, start, end)).toBe(196);
  });

  it('gives a day a fixed width when read week by week or month by month', () => {
    expect(weekWidth('weeks', 720, start, end)).toBe(168);
    expect(weekWidth('months', 720, start, end)).toBe(49);
  });
});

describe('the list of the plan', () => {
  it('writes the days of a booking in short', () => {
    // Intl puts thin spaces around the dash.
    expect(shortRange('2026-11-17', '2026-11-23', 'en')).toMatch(/^Nov 17\s–\s23$/u);
    expect(shortRange('2026-11-30', '2026-12-06', 'es')).toMatch(/30 nov.*6 dic/);
  });

  it('says progress only for a paid course', () => {
    const messages = { language: 'en' as const, t };
    expect(progressText(messages, course('a'))).toBeNull();
    expect(progressText(messages, paid('d', { progress: 0.25 }))).toBe('25% done');
  });
});

describe('what the tooltip says', () => {
  const messages = { language: 'en' as const, t, points: String };

  it('says the days, the missing length and that the learner moved it', () => {
    const lines = courseLines(
      messages,
      course('b', { booking: booking('2026-11-18', '2026-11-24', true) }),
    );
    expect(lines).toEqual([
      'November 18, 2026 to November 24, 2026',
      'Length not published: you can stretch it.',
      'You moved it.',
      'Free, on the provider’s site. Rewire cannot see your progress there.',
    ]);
  });

  it('says the progress of a paid course, or that it is completed', () => {
    const halfDone = paid('d', { progress: 0.5, booking: null });
    expect(courseLines(messages, halfDone)).toEqual([
      '2 hours',
      'Demo course of Rewire.',
      'To be paid',
      '50% done',
    ]);
    expect(courseLines(messages, { ...halfDone, enrolment: 'completed', progress: 1 }).at(-1)).toBe(
      'Completed',
    );
  });
});
