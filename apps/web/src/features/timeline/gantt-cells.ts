import type { DomConfig } from '@bryntum/core-community';
import type { PlannedCourse } from '@rewire/contracts';

import type { ChartContext } from './gantt-config.ts';
import { courseHref, FINISH_ID } from './gantt-data.ts';
import { paymentAction, paymentHref, paymentStatus, type PaidCourse } from './payment.ts';

const span = (className: string, text: string): DomConfig => ({ tag: 'span', className, text });

/** A link to a page of Rewire, followed through the router. */
const internalLink = (href: string, children: DomConfig[]): DomConfig => ({
  tag: 'a',
  href,
  dataset: { route: 'internal' },
  children,
});

/** The course's title, linked: a paid course to its page here, a free one to its provider. */
function courseCell(context: ChartContext, course: PlannedCourse): DomConfig {
  const href = courseHref(context.region, course);
  const title = span('rewire-course-title', course.title);
  if (course.kind === 'paid') {
    return { ...internalLink(href, [title]), title: course.title };
  }
  return {
    tag: 'a',
    href,
    target: '_blank',
    title: course.title,
    rel: 'noopener noreferrer',
    children: [
      title,
      span('visually-hidden', ` ${context.messages.t('plan.opensElsewhere')}`),
      { tag: 'span', ariaHidden: 'true', text: ' ↗' },
    ],
  };
}

/** A payment: its name and where it stands, linked to what the learner can do about it. */
function paymentCell(context: ChartContext, name: string, course: PaidCourse): DomConfig {
  const { messages } = context;
  return internalLink(paymentHref(context.region, course), [
    span('rewire-payment-name', name),
    span('rewire-payment-status', ` · ${paymentStatus(messages, course)}`),
    span('visually-hidden', `. ${paymentAction(messages, course)}`),
  ]);
}

/** A stage, with how many of its courses in the plan are done. */
function stageCell(context: ChartContext, name: string, id: string): DomConfig {
  const counts = context.stages.get(id);
  const done =
    counts === undefined || counts.total === 0
      ? []
      : [span('rewire-stage-done', context.messages.t('timeline.stageDone', counts))];
  return { tag: 'span', className: 'rewire-stage-name', children: [span('', name), ...done] };
}

/** The name cell of any row: a course, its payment, a stage or the end of the plan. */
export function nameCell(context: ChartContext, id: string, name: string): DomConfig {
  const course = context.courses.get(id);
  if (course !== undefined) {
    return courseCell(context, course);
  }
  const payment = context.payments.get(id);
  if (payment !== undefined) {
    return paymentCell(context, name, payment);
  }
  return id === FINISH_ID ? span('rewire-finish-name', name) : stageCell(context, name, id);
}

/** The hours of a course, or a dash said in words when its provider publishes none. */
export function hoursCell(context: ChartContext, id: string): DomConfig | string {
  const { t, language } = context.messages;
  const course = context.courses.get(id);
  if (course === undefined) {
    return '';
  }
  if (course.hours === null) {
    return {
      tag: 'span',
      className: 'rewire-hours',
      children: [
        { tag: 'span', ariaHidden: 'true', text: '—' },
        span('visually-hidden', t('timeline.noLength')),
      ],
    };
  }
  const hours = new Intl.NumberFormat(language).format(course.hours);
  return span('rewire-hours', t('timeline.hours', { hours }));
}
