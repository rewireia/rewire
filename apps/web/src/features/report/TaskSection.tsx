import type { ExposureReport, PersonalExposure } from '@rewire/contracts';
import { lazy, Suspense } from 'react';
import pageStyles from '../../app/Page.module.css';
import { LoadingBar } from '../../components/LoadingBar.tsx';
import { TranslationNote, useTranslatedTasks } from '../../components/task-translations.tsx';
import { useMessages } from '../../i18n/use-messages.ts';
import type { TimeByTask } from './times.ts';

const TaskTable = lazy(async () => ({ default: (await import('./TaskTable.tsx')).TaskTable }));
interface TaskSectionProps {
  readonly report: ExposureReport;
  readonly personal: PersonalExposure;
  readonly timeByTask: TimeByTask;
}

/** The saved journey results, presented in one read-only AG Grid view. */
export function TaskSection(props: TaskSectionProps) {
  const { t } = useMessages();
  const translated = useTranslatedTasks(props.report.isco08);
  return (
    <section className={pageStyles.section} aria-labelledby="report-tasks">
      <h2 id="report-tasks">{t('report.tasks.title')}</h2>
      <p className={pageStyles.lede}>{t('report.tasks.lede')}</p>
      <TranslationNote status={translated.status} />
      <Suspense fallback={<LoadingBar />}>
        <TaskTable {...props} />
      </Suspense>
    </section>
  );
}
