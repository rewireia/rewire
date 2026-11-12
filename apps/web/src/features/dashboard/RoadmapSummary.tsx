import type { Region } from '@rewire/contracts';
import type { ReactNode } from 'react';

import { useStudyTimeline } from '../../api/study-plan-queries.ts';
import { formatDate, formatList, formatMoney, interpolate } from '../../i18n/format.ts';
import { useMessages } from '../../i18n/use-messages.ts';
import { dashboardCopy } from './dashboard-copy.ts';
import { roadmapFigures, type RoadmapFigures } from './roadmap-figures.ts';
import styles from './RoadmapTab.module.css';

/** The colours of the chart, each with its word, in the order the eye meets them. */
const STAGES = ['understand', 'apply', 'strengthen'] as const;
const LEGEND = ['held', 'due', 'review', 'paid', 'refunded', 'today', 'finish'] as const;

/**
 * The head of "My roadmap": the plan in figures (its end, its hours at the learner's pace, the
 * courses done, paid and still to pay) and the key to the chart's colours.
 */
export function RoadmapSummary({
  region,
  isco08,
  today,
  children,
}: {
  readonly region: Region;
  readonly isco08: string;
  readonly today: string;
  /** The way to add courses, beside the title. */
  readonly children: ReactNode;
}) {
  const { language, t } = useMessages();
  const copy = dashboardCopy[language];
  const timeline = useStudyTimeline(region, isco08, today);
  const figures = timeline.data === undefined ? null : roadmapFigures(timeline.data);
  return (
    <>
      <section className={styles.summary} aria-labelledby="roadmap-summary">
        <div className={styles.summaryHead}>
          <p className={styles.eyebrow}>{copy.roadmapEyebrow}</p>
          <h2 id="roadmap-summary">{copy.plan}</h2>
          <p className={styles.lede}>{copy.roadmapLede}</p>
        </div>
        <div className={styles.summaryAction}>{children}</div>
        {figures === null ? (
          <p className={styles.waiting}>{timeline.isError ? copy.unavailable : copy.loading}</p>
        ) : (
          <Figures figures={figures} />
        )}
      </section>
      <ul className={styles.legend} aria-label={copy.legend}>
        {STAGES.map((stage) => (
          <li key={stage}>
            <span className={styles.swatch} data-kind={stage} aria-hidden="true" />
            {t(`stage.${stage}`)}
          </li>
        ))}
        {LEGEND.map((kind) => (
          <li key={kind}>
            <span className={styles.swatch} data-kind={kind} aria-hidden="true" />
            {copy.legendItems[kind]}
          </li>
        ))}
      </ul>
    </>
  );
}

function Figures({ figures }: { readonly figures: RoadmapFigures }) {
  const { language } = useMessages();
  const copy = dashboardCopy[language];
  const due =
    figures.due.length === 0
      ? copy.nothingDue
      : formatList(
          figures.due.map((money) => formatMoney(money, language)),
          language,
        );
  return (
    <dl className={styles.figures}>
      <div>
        <dt>{copy.finishes}</dt>
        <dd>{figures.finishesOn === null ? '—' : formatDate(figures.finishesOn, language)}</dd>
      </div>
      <div>
        <dt>{copy.pace}</dt>
        <dd>
          {interpolate(
            copy.paceValue,
            { hours: figures.knownHours, week: figures.hoursPerWeek },
            language,
          )}
        </dd>
      </div>
      <div>
        <dt>{copy.progressFigure}</dt>
        <dd>
          {interpolate(copy.progressValue, { done: figures.done, total: figures.inPlan }, language)}
        </dd>
      </div>
      <div>
        <dt>{copy.payments}</dt>
        <dd>
          {interpolate(copy.paymentsValue, { paid: figures.paid, due: figures.toPay }, language)}
        </dd>
      </div>
      <div data-accent={figures.due.length > 0 || undefined}>
        <dt>{copy.stillToPay}</dt>
        <dd>{due}</dd>
      </div>
    </dl>
  );
}
