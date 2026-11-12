import type { ExposureReport } from '@rewire/contracts';

import pageStyles from '../../app/Page.module.css';
import { useTranslatedTasks } from '../../components/task-translations.tsx';
import { toPoints } from '../../i18n/format.ts';
import { useMessages } from '../../i18n/use-messages.ts';

import { ExposureBarChart } from './ExposureBarChart.tsx';
import styles from './TaskComparison.module.css';

interface TaskComparisonProps {
  readonly report: ExposureReport;
  readonly title: string;
  readonly caption: string;
}

/** The published task scores, ordered by exposure; the score is not a probability. */
export function TaskComparison({ report, title, caption }: TaskComparisonProps) {
  const { t, points } = useMessages();
  const translated = useTranslatedTasks(report.isco08);
  const tasks = report.tasks.slice(0, 5);
  if (tasks.length === 0) return null;
  const rows = tasks.map((task, index) => ({
    label: `T${index + 1}`,
    detail: translated.text(task),
    score: toPoints(task.score),
    color: task.band,
  }));
  return (
    <section
      className={`${pageStyles.section} ${styles.panel}`}
      aria-labelledby="report-task-comparison"
    >
      <h2 id="report-task-comparison">{title}</h2>
      <p className={styles.caption}>{caption}</p>
      <div className={styles.layout}>
        <ExposureBarChart rows={rows} />
        <ol className={styles.list}>
          {tasks.map((task, index) => (
            <li key={task.id} data-band={task.band}>
              <div className={styles.label}>
                <span>
                  <span className={styles.code}>T{index + 1}</span>{' '}
                  <span lang={translated.language(task)} title={translated.original(task)}>
                    {translated.text(task)}
                  </span>
                </span>
                <strong className={styles.score}>{points(task.score)}</strong>
              </div>
              <span className={styles.band}>{t(`band.${task.band}`)}</span>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
