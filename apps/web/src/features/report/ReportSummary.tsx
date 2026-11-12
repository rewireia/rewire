import type { ExposureReport, PersonalExposure } from '@rewire/contracts';
import { useMessages } from '../../i18n/use-messages.ts';
import { ExposureComparison } from './ExposureComparison.tsx';
import { ReportFacts } from './ReportFacts.tsx';
import { TaskComparison } from './TaskComparison.tsx';
import { Figures } from './Figures.tsx';
import { WeekSplit } from './WeekSplit.tsx';
import styles from './ReportView.module.css';

/** Official evidence and the user's weighted week, with comparable scales. */
export function ReportSummary({
  report,
  personal,
  updating,
}: {
  readonly report: ExposureReport;
  readonly personal: PersonalExposure;
  readonly updating: boolean;
}) {
  const { t } = useMessages();
  return (
    <section aria-label={t('report.week.label')}>
      <Figures report={report} personal={personal} updating={updating} />
      <p className={styles.caveat}>{t('report.summary.caveat')}</p>
      <ReportFacts report={report} personal={personal} />
      <div className={styles.visuals}>
        <WeekSplit
          weekByBand={personal.weekByBand}
          tasksByBand={report.tasksByBand}
          weekLabel={t('report.visual.weekLabel')}
          tasksLabel={t('report.visual.tasksLabel')}
          selectorLabel={t('report.visual.selectorLabel')}
          tasksCaption={t('report.visual.distributionCaption')}
        />
        <ExposureComparison
          report={report}
          personal={personal}
          title={t('report.visual.compareTitle')}
          caption={t('report.visual.compareCaption')}
          weekLabel={t('report.visual.weekLabel')}
          occupationLabel={t('report.visual.occupationLabel')}
          noWeek={t('report.visual.noWeek')}
        />
      </div>
      <TaskComparison
        report={report}
        title={t('report.visual.tasksTitle')}
        caption={t('report.visual.tasksCaption')}
      />
    </section>
  );
}
