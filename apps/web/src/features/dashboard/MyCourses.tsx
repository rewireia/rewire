import type { Enrolment } from '@rewire/contracts';
import { Link } from 'react-router';

import { ButtonLink } from '../../components/Button.tsx';
import { interpolate } from '../../i18n/format.ts';
import { useMessages } from '../../i18n/use-messages.ts';
import { dashboardCopy } from './dashboard-copy.ts';
import styles from './Overview.module.css';

/** "My courses": each enrolment with its progress and the way back into it. */
export function MyCourses({ enrolments }: { readonly enrolments: readonly Enrolment[] }) {
  const { language } = useMessages();
  const copy = dashboardCopy[language];
  return (
    <section className={styles.card} aria-labelledby="dashboard-courses">
      <header className={styles.cardHead}>
        <p className={styles.eyebrow}>{copy.stages.learn}</p>
        <h2 id="dashboard-courses">{copy.courses}</h2>
      </header>
      {enrolments.length === 0 ? (
        <div className={styles.emptyBlock}>
          <p>{copy.coursesEmpty}</p>
          <ButtonLink to="/courses">{copy.findCourses}</ButtonLink>
        </div>
      ) : (
        <ul className={styles.courseList}>
          {enrolments.map((enrolment) => (
            <CourseRow key={enrolment.courseId} enrolment={enrolment} />
          ))}
        </ul>
      )}
    </section>
  );
}

function CourseRow({ enrolment }: { readonly enrolment: Enrolment }) {
  const { language } = useMessages();
  const copy = dashboardCopy[language];
  const done = enrolment.status === 'completed';
  if (enrolment.kind === 'listed') {
    return <ListedRow enrolment={enrolment} />;
  }
  const share = enrolment.lessons === 0 ? 0 : enrolment.lessonsCompleted / enrolment.lessons;
  return (
    <li className={styles.courseRow} data-status={enrolment.status}>
      <div className={styles.courseText}>
        <Link to={`/learn/${enrolment.courseId}`} className={styles.courseTitle}>
          {enrolment.title}
        </Link>
        <span className={styles.courseMeta}>
          {done
            ? copy.completed
            : interpolate(
                copy.lessons,
                { done: enrolment.lessonsCompleted, total: enrolment.lessons },
                language,
              )}
        </span>
      </div>
      <span className={styles.progress} aria-hidden="true">
        <span style={{ inlineSize: `${Math.round(share * 100)}%` }} />
      </span>
      {done && enrolment.certificateId !== null ? (
        <Link to={`/certificates/${enrolment.certificateId}`} className={styles.rowAction}>
          {copy.certificate}
        </Link>
      ) : (
        <Link to={`/learn/${enrolment.courseId}`} className={styles.rowAction}>
          {done ? copy.view : copy.learn}
        </Link>
      )}
    </li>
  );
}

/** A course taken at its provider: no lessons here, the way back is the provider's page. */
function ListedRow({ enrolment }: { readonly enrolment: Extract<Enrolment, { kind: 'listed' }> }) {
  const { language } = useMessages();
  const copy = dashboardCopy[language];
  const done = enrolment.status === 'completed';
  return (
    <li className={styles.courseRow} data-status={enrolment.status}>
      <div className={styles.courseText}>
        <a
          href={enrolment.url}
          target="_blank"
          rel="noopener noreferrer"
          className={styles.courseTitle}
        >
          {enrolment.title}
        </a>
        <span className={styles.courseMeta}>
          {done
            ? copy.completed
            : interpolate(copy.atProvider, { provider: enrolment.provider }, language)}
        </span>
      </div>
      <span className={styles.progress} aria-hidden="true" />
      <a
        href={enrolment.url}
        target="_blank"
        rel="noopener noreferrer"
        className={styles.rowAction}
      >
        {copy.learn}
      </a>
    </li>
  );
}
