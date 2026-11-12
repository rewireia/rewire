import type { DomConfig } from '@bryntum/core-community';
import type { TaskModel } from '@bryntum/gantt-community';

import type { ContextSource } from './gantt-config.ts';
import { FINISH_ID, isCompleted } from './gantt-data.ts';
import { isWaiting } from './payment.ts';

const label = (className: string, text: string): DomConfig => ({ tag: 'span', className, text });

/**
 * The inside of a bar: a course's real progress and its title, and the marks that say what it
 * is, just before it, like a label on a chart: a short course has no room inside. A payment and the
 * end of the plan say what they are just after their diamond.
 */
export function barContent(source: ContextSource, task: TaskModel): DomConfig[] {
  const { courses, payments, messages } = source();
  const { t } = messages;
  const id = String(task.id);
  const payment = payments.get(id);
  if (payment !== undefined) {
    return [label('rewire-milestone-label', t(`timeline.payment.short.${payment.payment}`))];
  }
  if (id === FINISH_ID) {
    return [label('rewire-milestone-label', t('timeline.finish'))];
  }
  const course = courses.get(id);
  if (course === undefined) {
    return [];
  }
  const marks = [
    isWaiting(course) ? t('timeline.held.label') : null,
    course.kind === 'paid' ? t('timeline.bar.demo') : null,
    isCompleted(course) ? `✓ ${t('timeline.bar.done')}` : null,
  ].filter((mark) => mark !== null);
  const progress = {
    tag: 'span',
    className: 'rewire-progress',
    style: { width: `${Math.round(course.progress * 100)}%` },
  };
  const title = label('rewire-bar-title', course.title);
  return marks.length === 0
    ? [progress, title]
    : [progress, title, label('rewire-bar-label', marks.join(' · '))];
}
