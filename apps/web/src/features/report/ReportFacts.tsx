import type { ExposureReport, PersonalExposure } from '@rewire/contracts';
import { useMessages } from '../../i18n/use-messages.ts';
import styles from './ReportView.module.css';

/** Counts from the official report and the user's confirmed time allocation. */
export function ReportFacts({
  report,
  personal,
}: {
  readonly report: ExposureReport;
  readonly personal: PersonalExposure;
}) {
  const { t, language } = useMessages();
  const format = new Intl.NumberFormat(language);
  const facts = [
    ['report.visual.tasksTotal', report.tasks.length],
    ['report.visual.tasksYours', personal.tasksCounted],
    ['report.visual.tasksReviewed', report.tasks.filter((task) => task.reviewedByExperts).length],
  ] as const;
  return (
    <dl className={styles.facts}>
      {facts.map(([label, value]) => (
        <div key={label}>
          <dt>{t(label)}</dt>
          <dd>{format.format(value)}</dd>
        </div>
      ))}
    </dl>
  );
}
