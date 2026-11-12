import type { CourseCard, Region } from '@rewire/contracts';
import { Link } from 'react-router';

import { formatMoney } from '../../i18n/format.ts';
import { useMessages } from '../../i18n/use-messages.ts';

import { PayLaterNote } from './PayLaterNote.tsx';
import styles from './Plan.module.css';

interface CourseCardViewProps {
  readonly region: Region;
  readonly course: CourseCard;
  /** In the guide's narrow panel, the outcomes are left out. */
  readonly compact?: boolean;
}

/** A paid course of the demonstration catalogue: level, hours, outcomes, price and status. */
export function CourseCardView({ region, course, compact = false }: CourseCardViewProps) {
  const { t, language } = useMessages();
  const hours = new Intl.NumberFormat(language).format(course.hours);
  return (
    <article className={styles.course}>
      <div className={styles.courseHead}>
        <span className={styles.demo}>{t('course.demo')}</span>
        <span className={styles.small}>
          {t(`level.${course.level}`)} · {t('course.hours', { hours })} ·{' '}
          {t('course.lessons', { count: course.lessons })}
        </span>
      </div>
      <h4 className={styles.courseTitle} lang="en">
        <Link to={`/${region}/courses/${course.id}`}>{course.title}</Link>
      </h4>
      {!compact && (
        <>
          <p className={styles.small} lang="en">
            {course.summary}
          </p>
          <span className={styles.label}>{t('course.outcomes')}</span>
          <ul className={styles.outcomes} lang="en">
            {course.outcomes.map((outcome) => (
              <li key={outcome}>{outcome}</li>
            ))}
          </ul>
        </>
      )}
      <div className={styles.courseFoot}>
        <span className={styles.price}>{formatMoney(course.price, language)}</span>
        <span className={styles.status} data-status={course.enrolment}>
          {t(`enrolment.${course.enrolment}`)}
        </span>
      </div>
      {!compact && <PayLaterNote hints={course.payLater} />}
    </article>
  );
}
