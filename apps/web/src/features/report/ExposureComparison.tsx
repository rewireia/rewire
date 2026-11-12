import type { ExposureReport, PersonalExposure } from '@rewire/contracts';

import pageStyles from '../../app/Page.module.css';
import { toPoints } from '../../i18n/format.ts';
import { useMessages } from '../../i18n/use-messages.ts';

import { ExposureBarChart, type ExposureBarRow } from './ExposureBarChart.tsx';
import styles from './TaskComparison.module.css';

interface ExposureComparisonProps {
  readonly report: ExposureReport;
  readonly personal: PersonalExposure;
  readonly title: string;
  readonly caption: string;
  readonly weekLabel: string;
  readonly occupationLabel: string;
  readonly noWeek: string;
}

/** Compares the time-weighted week with the published occupational mean. */
export function ExposureComparison(props: ExposureComparisonProps) {
  const { report, personal, title, caption, weekLabel, occupationLabel, noWeek } = props;
  const { points } = useMessages();
  const rows: ExposureBarRow[] = [
    ...(personal.score === null
      ? []
      : [{ label: weekLabel, score: toPoints(personal.score), color: 'accent' as const }]),
    { label: occupationLabel, score: toPoints(report.meanScore), color: 'ink' },
  ];
  return (
    <section
      className={`${pageStyles.section} ${styles.panel}`}
      aria-labelledby="report-exposure-comparison"
    >
      <h2 id="report-exposure-comparison">{title}</h2>
      <p className={styles.caption}>{caption}</p>
      <ExposureBarChart rows={rows} />
      <ul className={styles.list}>
        <li className={styles.label}>
          <span>{weekLabel}</span>
          <strong className={styles.score}>
            {personal.score === null ? noWeek : points(personal.score)}
          </strong>
        </li>
        <li className={styles.label}>
          <span>{occupationLabel}</span>
          <strong className={styles.score}>{points(report.meanScore)}</strong>
        </li>
      </ul>
    </section>
  );
}
