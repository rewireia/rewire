import type { Region, StudyPlan, StudyTimeline } from '@rewire/contracts';

import { useMessages } from '../../i18n/use-messages.ts';

import { ListCourse } from './ListCourse.tsx';
import styles from './PlanList.module.css';

interface PlanListProps {
  readonly region: Region;
  readonly timeline: StudyTimeline;
  readonly busy: boolean;
  readonly onChange: (plan: StudyPlan) => void;
}

/** The plan in time as a list: the same courses and choices as the chart, with the keyboard. */
export function PlanList({ region, timeline, busy, onChange }: PlanListProps) {
  const { t } = useMessages();
  return (
    <div className={styles.list}>
      <p className={styles.lede}>{t('timeline.list.lede')}</p>
      {timeline.stages.map((stage) => (
        <section key={stage.stage} className={styles.stage} aria-labelledby={`list-${stage.stage}`}>
          <h3 id={`list-${stage.stage}`} className={styles.stageName}>
            {t(`stage.${stage.stage}`)}
          </h3>
          <ol className={styles.courses}>
            {stage.courses.map((course) => (
              <ListCourse
                key={course.id}
                region={region}
                course={course}
                timeline={timeline}
                busy={busy}
                onChange={onChange}
              />
            ))}
          </ol>
        </section>
      ))}
    </div>
  );
}
