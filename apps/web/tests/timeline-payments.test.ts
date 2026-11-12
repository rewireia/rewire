import { describe, expect, it } from 'vitest';

import { paymentLines } from '../src/features/timeline/course-lines.ts';
import { paymentId, planDependencies, toGanttData } from '../src/features/timeline/gantt-data.ts';
import { foldLine, icsText, planCalendar } from '../src/features/timeline/ics.ts';
import {
  heldSentence,
  isWaiting,
  milestoneDay,
  paymentHref,
  paymentName,
  paymentStatus,
} from '../src/features/timeline/payment.ts';
import { planSummary } from '../src/features/timeline/summary.ts';

import { booking, chartNames, course, paid, timeline, words } from './timeline-plan.ts';

const held = { ...booking('2026-11-20', '2026-11-22'), heldByPayment: true };

describe('the payment of a paid course', () => {
  it('stands on the day it is needed, or on the day it was paid', () => {
    expect(milestoneDay(paid('d', { booking: booking('2026-11-25', '2026-11-28') }))).toBe(
      '2026-11-25',
    );
    const late = paid('d', { payment: 'paid', paidOn: '2026-11-20', booking: held });
    expect(milestoneDay(late)).toBe('2026-11-20');
    expect(milestoneDay(paid('d', { booking: null }))).toBeNull();
  });

  it('is a milestone row before its course, joined to it by an arrow', () => {
    const data = toGanttData(timeline(), chartNames);
    const [, milestone, course] = data.tasks[1]?.children ?? [];
    expect(milestone?.id).toBe(paymentId('d'));
    expect(milestone?.name).toBe('PayPal · $19');
    expect(milestone?.startDate).toEqual(milestone?.endDate);
    expect(milestone?.cls).toBe('rewire-payment rewire-payment-due');
    expect([milestone?.draggable, milestone?.resizable]).toEqual([false, false]);
    expect(course?.id).toBe('d');
    expect(planDependencies(timeline())).toContainEqual({
      id: 'pay-d>d',
      fromTask: 'pay-d',
      toTask: 'd',
    });
    expect(data.payments.get('pay-d')?.id).toBe('d');
  });

  it('says where it stands in words, never by colour alone', () => {
    const states = ['due', 'held-by-paypal', 'invoice-sent', 'refunded'] as const;
    expect(states.map((payment) => paymentStatus(words, paid('d', { payment })))).toEqual([
      'To be paid',
      'Held by PayPal for review',
      'Invoice sent to your employer',
      'Refunded',
    ]);
    expect(paymentStatus(words, paid('d', { payment: 'paid', paidOn: '2026-11-12' }))).toBe(
      'Paid on November 12, 2026',
    );
    expect(paymentName(words, paid('d'))).toBe('PayPal · $19');
  });

  it('leads to where the learner can act on it', () => {
    expect(paymentHref('us', paid('d'))).toBe('/us/courses/d');
    expect(paymentHref('us', paid('d', { payment: 'refunded' }))).toBe('/us/courses/d');
    expect(paymentHref('us', paid('d', { payment: 'invoice-sent' }))).toBe('/dashboard');
    expect(paymentHref('us', paid('d', { payment: 'paid' }))).toBe('/learn/d');
  });

  it('explains a course it holds, and one that started late', () => {
    const waiting = paid('d', { booking: held });
    expect(isWaiting(waiting)).toBe(true);
    expect(heldSentence(words, waiting)).toBe(
      'It cannot start until it is paid for: it moves a day later each day until then.',
    );
    const late = paid('d', { booking: held, payment: 'paid', paidOn: '2026-11-20' });
    expect(isWaiting(late)).toBe(false);
    expect(heldSentence(words, late)).toBe('It started the day it was paid for.');
    expect(heldSentence(words, paid('d'))).toBeNull();
    expect(paymentLines(words, waiting).at(-1)).toBe('Pay for it: Course d');
  });

  it('marks the bar of a course that waits, and counts it in the sentence of the plan', () => {
    const plan = timeline({
      stages: [{ stage: 'apply', courses: [course('a'), paid('d', { booking: held })] }],
    });
    const [, , bar] = toGanttData(plan, chartNames).tasks[0]?.children ?? [];
    expect(bar?.cls).toContain('rewire-held');
    expect(planSummary(plan, words.t, 'en').details.at(-1)).toBe(
      'One course waits for its payment, so the plan moves a day later each day until it is paid.',
    );
  });
});

describe('the end of the plan and the stages', () => {
  it('ends with a milestone after the last day, reached from the last course', () => {
    const data = toGanttData(timeline(), chartNames);
    const finish = data.tasks.at(-1);
    expect(finish?.id).toBe('finish');
    expect(finish?.startDate).toEqual(new Date(2026, 10, 29));
    expect(planDependencies(timeline()).at(-1)).toEqual({
      id: 'd>finish',
      fromTask: 'd',
      toTask: 'finish',
    });
    expect(toGanttData(timeline({ finishesOn: null }), chartNames).tasks.at(-1)?.id).not.toBe(
      'finish',
    );
  });

  it('counts the courses of each stage in the plan that are done', () => {
    const plan = timeline({
      stages: [{ stage: 'apply', courses: [paid('d', { progress: 1 }), course('a')] }],
    });
    expect(toGanttData(plan, chartNames).stages.get('stage-apply')).toEqual({ done: 1, total: 2 });
  });
});

describe('the plan as a calendar file', () => {
  const now = new Date(Date.UTC(2026, 10, 11, 8, 30));

  it('has one all-day event per course in the plan, ending the day after its last', () => {
    const file = planCalendar(timeline(), { note: 'A course of your plan.' }, now);
    expect(file.startsWith('BEGIN:VCALENDAR\r\nVERSION:2.0\r\n')).toBe(true);
    expect(file.endsWith('END:VCALENDAR\r\n')).toBe(true);
    expect(file.match(/BEGIN:VEVENT/g)).toHaveLength(3);
    expect(file).toContain('DTSTART;VALUE=DATE:20261118\r\nDTEND;VALUE=DATE:20261125\r\n');
    expect(file).toContain('SUMMARY:Course d\r\n');
    expect(file).toContain('DTSTAMP:20261111T083000Z\r\n');
    expect(file).not.toContain('Course c');
  });

  it('escapes text and folds long lines', () => {
    expect(icsText('Ethics; AI, and\nmore\\')).toBe('Ethics\\; AI\\, and\\nmore\\\\');
    const folded = foldLine(`SUMMARY:${'x'.repeat(100)}`);
    expect(folded.split('\r\n ').map((line) => line.length)).toEqual([75, 33]);
  });
});
