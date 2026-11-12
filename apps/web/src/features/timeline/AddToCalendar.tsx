import type { StudyTimeline } from '@rewire/contracts';

import { Button } from '../../components/Button.tsx';
import { useMessages } from '../../i18n/use-messages.ts';

import { planCalendar } from './ics.ts';

/** "Add to my calendar": the plan in time as a file every calendar opens. */
export function AddToCalendar({ timeline }: { readonly timeline: StudyTimeline }) {
  const { t } = useMessages();
  if (timeline.finishesOn === null) {
    return null;
  }
  const download = () => {
    const text = planCalendar(timeline, { note: t('timeline.ics.note') }, new Date());
    const url = URL.createObjectURL(new Blob([text], { type: 'text/calendar;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = t('timeline.ics.file');
    link.click();
    // The address is let go once the browser has taken the file.
    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 0);
  };
  return <Button onClick={download}>{t('timeline.ics.button')}</Button>;
}
