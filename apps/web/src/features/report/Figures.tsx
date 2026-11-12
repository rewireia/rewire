import type { ExposureReport, PersonalExposure } from '@rewire/contracts';

import { BigFigure } from '../../components/BigFigure.tsx';
import { useMessages } from '../../i18n/use-messages.ts';

import styles from './ReportView.module.css';

interface FiguresProps {
  readonly report: ExposureReport;
  readonly personal: PersonalExposure;
  readonly updating: boolean;
}

/** Your week, the level and the standing of the occupation, each with what it means. */
export function Figures({ report, personal, updating }: FiguresProps) {
  const { t, points } = useMessages();
  const { standing, gradient } = report;
  const week = personal.score === null ? '—' : points(personal.score);
  const weekSentence =
    personal.score === null || personal.range === null
      ? t('report.week.none')
      : t('report.week.sentence', {
          low: points(personal.range.low),
          high: points(personal.range.high),
        });
  return (
    <div className={styles.figures}>
      <BigFigure
        label={t('report.week.label')}
        value={week}
        sentence={weekSentence}
        updating={updating}
      />
      <BigFigure
        label={t('report.level.label')}
        value={t(`gradient.${gradient}`)}
        sentence={t(`gradient.${gradient}.sentence`)}
      />
      <BigFigure
        label={t('report.standing.label')}
        value={t('report.standing.figure', {
          rank: standing.moreExposed + 1,
          total: standing.outOf,
        })}
        sentence={t('report.standing.sentence', {
          total: standing.outOf,
          above: standing.moreExposed,
        })}
      />
      <p className="visually-hidden" aria-live="polite">
        {personal.score === null ? t('report.week.none') : t('report.week.live', { score: week })}
      </p>
    </div>
  );
}
