import { StringHelper } from '@bryntum/core-community';
import type { TaskModel } from '@bryntum/gantt-community';

import { formatDate } from '../../i18n/format.ts';

import { lastDayOf } from './calendar.ts';
import { courseLines, paymentLines } from './course-lines.ts';
import type { ChartContext, ContextSource } from './gantt-config.ts';
import { FINISH_ID } from './gantt-data.ts';

/** The lines under the title of any row: a course, a payment or the end of the plan. */
function linesOf(context: ChartContext, task: TaskModel): string[] {
  const id = String(task.id);
  const course = context.courses.get(id);
  if (course !== undefined) {
    return courseLines(context.messages, course);
  }
  const payment = context.payments.get(id);
  if (payment !== undefined) {
    return paymentLines(context.messages, payment);
  }
  const end = task.endDate;
  if (id === FINISH_ID && end instanceof Date) {
    // The end of the plan stands at the end of its last day.
    return [formatDate(lastDayOf(end), context.messages.language)];
  }
  return [];
}

/** The tooltip of a bar, as escaped HTML: Bryntum's task tooltip takes a string. */
export function tooltipHtml(source: ContextSource, task: TaskModel): string {
  const context = source();
  const title = String(task.getData('name'));
  const lines = linesOf(context, task);
  return [
    StringHelper.xss`<p class="rewire-tip-title">${title}</p>`,
    ...lines.map((line) => StringHelper.xss`<p class="rewire-tip-line">${line}</p>`),
  ].join('');
}
