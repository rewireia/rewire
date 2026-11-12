import type { StudyTimeline } from '@rewire/contracts';

import { useMessages } from '../../i18n/use-messages.ts';

import { planSummary } from './summary.ts';
import styles from './Timeline.module.css';

/** When the plan ends at this pace, and what that date is made of. */
export function PlanSummaryText({ timeline }: { readonly timeline: StudyTimeline }) {
  const { t, language } = useMessages();
  const { headline, details } = planSummary(timeline, t, language);
  return (
    <div className={styles.summary} aria-live="polite">
      <p className={styles.headline}>{headline}</p>
      {details.map((detail) => (
        <p key={detail} className={styles.detail}>
          {detail}
        </p>
      ))}
    </div>
  );
}
