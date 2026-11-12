import type { PlannedCourse, Region, StudyPlan, StudyTimeline } from '@rewire/contracts';
import { useId } from 'react';
import { Link } from 'react-router';

import { cx } from '../../components/cx.ts';
import { useMessages } from '../../i18n/use-messages.ts';

import { progressText, shortRange } from './course-lines.ts';
import { courseHref } from './gantt-data.ts';
import { BookedDaysField, NotBeforeField } from './ListFields.tsx';
import {
  heldSentence,
  isWaiting,
  paymentAction,
  paymentHref,
  paymentName,
  paymentStatus,
  type PaidCourse,
} from './payment.ts';
import { withCourse } from './plan-changes.ts';
import styles from './PlanList.module.css';

interface ListCourseProps {
  readonly region: Region;
  readonly course: PlannedCourse;
  readonly timeline: StudyTimeline;
  readonly busy: boolean;
  readonly onChange: (plan: StudyPlan) => void;
}

function CourseTitle({ region, course }: Pick<ListCourseProps, 'region' | 'course'>) {
  const { t } = useMessages();
  if (course.kind === 'paid') {
    return <Link to={courseHref(region, course)}>{course.title}</Link>;
  }
  return (
    <a href={course.url} target="_blank" rel="noopener noreferrer">
      {course.title}
      <span className="visually-hidden"> {t('plan.opensElsewhere')}</span>
      <span aria-hidden="true"> ↗</span>
    </a>
  );
}

/** What is known of a course: its days, its length and how far it is done. */
function CourseFacts({ course }: Pick<ListCourseProps, 'course'>) {
  const messages = useMessages();
  const { t, language } = messages;
  const { booking, hours } = course;
  const progress = progressText(messages, course);
  const length =
    hours === null
      ? t('timeline.list.noLength')
      : t('timeline.hours', { hours: new Intl.NumberFormat(language).format(hours) });
  return (
    <p className={styles.facts}>
      <span className={styles.dates}>
        {booking === null
          ? t('timeline.list.outOfPlan')
          : shortRange(booking.startsOn, booking.endsOn, language)}
      </span>
      <span>{length}</span>
      {progress !== null && <span>{progress}</span>}
    </p>
  );
}

/** The payment of a paid course: price, where it stands, why it holds the course, what to do. */
function CoursePayment({
  region,
  course,
}: {
  readonly region: Region;
  readonly course: PaidCourse;
}) {
  const messages = useMessages();
  const held = heldSentence(messages, course);
  return (
    <div className={cx(styles.payment, isWaiting(course) && styles.waiting)}>
      <p className={styles.paymentLine}>
        <span>{paymentName(messages, course)}</span>
        <span>{paymentStatus(messages, course)}</span>
        <Link to={paymentHref(region, course)}>{paymentAction(messages, course)}</Link>
      </p>
      {held !== null && (
        <p className={styles.held}>
          {isWaiting(course) && <strong>{messages.t('timeline.held.label')}. </strong>}
          {held}
        </p>
      )}
    </div>
  );
}

/** A course of the list, with the choices the chart offers by mouse. */
export function ListCourse({ region, course, timeline, busy, onChange }: ListCourseProps) {
  const { t } = useMessages();
  const { plan } = timeline;
  const inPlan = course.booking !== null;
  const titleId = useId();
  return (
    <li className={cx(styles.course, !inPlan && styles.out)} aria-labelledby={titleId}>
      <div className={styles.head}>
        {course.kind === 'paid' && <span className={styles.demo}>{t('course.demo')}</span>}
        <h4 id={titleId} className={styles.title}>
          <CourseTitle region={region} course={course} />
        </h4>
      </div>
      <CourseFacts course={course} />
      {course.kind === 'paid' && <CoursePayment region={region} course={course} />}
      <div
        className={styles.fields}
        role="group"
        aria-label={t('timeline.list.fieldsOf', { title: course.title })}
      >
        <label className={styles.check}>
          <input
            type="checkbox"
            checked={inPlan}
            disabled={busy}
            onChange={() => {
              onChange(withCourse(plan, course.id, !inPlan));
            }}
          />
          {t('timeline.inPlanLabel')}
        </label>
        {inPlan && (
          <NotBeforeField courseId={course.id} plan={plan} busy={busy} onChange={onChange} />
        )}
        {inPlan && course.hours === null && (
          <BookedDaysField
            courseId={course.id}
            booked={plan.bookedDays[course.id] ?? timeline.defaultBookedDays}
            plan={plan}
            busy={busy}
            onChange={onChange}
          />
        )}
      </div>
    </li>
  );
}
