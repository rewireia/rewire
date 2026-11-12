import type { Region, RoadmapCourse } from '@rewire/contracts';
import { useMessages } from '../../i18n/use-messages.ts';
import { formatMoney, interpolate } from '../../i18n/format.ts';
import { dashboardCopy } from './dashboard-copy.ts';
import { RoadmapActions } from './RoadmapActions.tsx';
import styles from './ControlPanel.module.css';

/** The courses of the plan, each with its date, state, price and what can be done with it. */
export function RoadmapCards({
  courses,
  region,
}: {
  readonly courses: readonly RoadmapCourse[];
  readonly region: Region;
}) {
  const { language } = useMessages();
  const copy = dashboardCopy[language];
  return (
    <div className={styles.courseCards}>
      {courses.map((course) => (
        <article className={styles.courseCard} key={course.courseId} data-status={course.status}>
          <span className={styles.eyebrow}>
            {new Intl.DateTimeFormat(language, {
              month: 'long',
              year: 'numeric',
              timeZone: 'UTC',
            }).format(new Date(`${course.date}T12:00:00Z`))}
          </span>
          <h3>{course.title}</h3>
          <span className={styles.status} data-status={course.status}>
            {copy[course.status]}
          </span>
          <div className={styles.courseMeta}>
            <span>
              {course.hours === null
                ? copy.hoursUnknown
                : interpolate(copy.hours, { hours: course.hours }, language)}
            </span>
            <span>{formatMoney(course.price, language)}</span>
          </div>
          <RoadmapActions course={course} courses={courses} region={region} />
        </article>
      ))}
    </div>
  );
}
