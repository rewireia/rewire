import { DateHelper, StringHelper } from '@bryntum/core-community';

import { toDay, toLocalDate } from './calendar.ts';
import type { ContextSource } from './gantt-config.ts';

/** Where in its week a day falls, as a share of the week: the middle of that day. */
function shareOfWeek(start: Date, end: Date, day: Date): number {
  const span = end.getTime() - start.getTime();
  return (day.getTime() - start.getTime() + span / 14) / span;
}

/**
 * The weeks of the time axis, with today marked by a fine line in its week. Bryntum
 * Community has no time ranges, so the mark lives in the header, drawn by its renderer,
 * which takes HTML.
 */
export function weekHeader(source: ContextSource) {
  return {
    unit: 'week' as const,
    renderer: (start: Date, end: Date, headerConfig: { headerCellCls?: string }): string => {
      const text = DateHelper.format(start, 'DD MMM');
      const today = toLocalDate(toDay(new Date()));
      if (today < start || today >= end) {
        return StringHelper.encodeHtml(text);
      }
      headerConfig.headerCellCls = 'rewire-today-week';
      const left = (shareOfWeek(start, end, today) * 100).toFixed(2);
      const label = source().messages.t('timeline.today');
      const mark = StringHelper.xss`<span class="rewire-today" style="left: ${left}%"></span>`;
      const words = StringHelper.xss`<span class="visually-hidden">${label}</span>`;
      return `${StringHelper.encodeHtml(text)}${mark}${words}`;
    },
  };
}
