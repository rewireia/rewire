import type { CourseCard } from '@rewire/contracts';

import pageStyles from '../../app/Page.module.css';
import { useMessages } from '../../i18n/use-messages.ts';
import { PayLaterNote } from '../plan/PayLaterNote.tsx';

import styles from './Course.module.css';

/** Step, level, hours, lessons and what the learner will be able to do. */
export function CourseFacts({ course }: { readonly course: CourseCard }) {
  const { t, language } = useMessages();
  const hours = new Intl.NumberFormat(language).format(course.hours);
  return (
    <section className={pageStyles.section} aria-labelledby="course-facts">
      <h2 id="course-facts" className="visually-hidden">
        {t('course.factsTitle')}
      </h2>
      <dl className={styles.facts}>
        <div>
          <dt>{t('course.stage')}</dt>
          <dd>{t(`stage.${course.stage}`)}</dd>
        </div>
        <div>
          <dt>{t('course.level')}</dt>
          <dd>{t(`level.${course.level}`)}</dd>
        </div>
        <div>
          <dt>{t('course.length')}</dt>
          <dd>
            {t('course.hours', { hours })} · {t('course.lessons', { count: course.lessons })}
          </dd>
        </div>
      </dl>
      <h3>{t('course.outcomes')}</h3>
      <ul className={styles.outcomes} lang="en">
        {course.outcomes.map((outcome) => (
          <li key={outcome}>{outcome}</li>
        ))}
      </ul>
      <PayLaterNote hints={course.payLater} />
    </section>
  );
}
