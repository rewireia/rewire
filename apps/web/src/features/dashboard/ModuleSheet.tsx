import type { PlannedCourse, Region, RoadmapCourse, StudyTimeline } from '@rewire/contracts';
import { Link } from 'react-router';

import { usePayments } from '../../api/commerce-queries.ts';
import { useSaveStudyPlan } from '../../api/study-plan-queries.ts';
import { Button, ButtonLink } from '../../components/Button.tsx';
import { ErrorNotice } from '../../components/ErrorNotice.tsx';
import { formatDate, formatMoney, interpolate } from '../../i18n/format.ts';
import { useMessages } from '../../i18n/use-messages.ts';
import { PayFromBalance } from '../marketplace/PayFromBalance.tsx';
import { dashboardCopy } from './dashboard-copy.ts';
import { removable } from './path-modules.ts';
import { withoutCourse } from './roadmap-edit.ts';
import { usePathEdit } from './use-path-edit.ts';
import styles from './RoadmapPath.module.css';

interface SheetProps {
  readonly course: PlannedCourse;
  readonly timeline: StudyTimeline;
  readonly roadmap: readonly RoadmapCourse[];
  readonly region: Region;
  readonly today: string;
}

/** The card of the module picked on the path: its facts and everything that can be done. */
export function ModuleSheet(props: SheetProps) {
  const { course } = props;
  const { language, t } = useMessages();
  const copy = dashboardCopy[language];
  const { booking } = course;
  return (
    <article className={styles.sheet} data-stage={course.stage} aria-labelledby="module-title">
      <p className={styles.sheetStage}>
        {t(`stage.${course.stage}`)}
        {course.addedByLearner === true && <span> · {copy.addedByYou}</span>}
      </p>
      <h3 id="module-title">{course.title}</h3>
      <dl className={styles.facts}>
        <div>
          <dt>{copy.when}</dt>
          <dd>
            {booking === null
              ? copy.outOfPlan
              : `${formatDate(booking.startsOn, language)} – ${formatDate(booking.endsOn, language)}`}
          </dd>
        </div>
        <div>
          <dt>{copy.length}</dt>
          <dd>
            {course.hours === null
              ? copy.hoursUnknown
              : interpolate(copy.hours, { hours: course.hours }, language)}
          </dd>
        </div>
        <div>
          <dt>{copy.price}</dt>
          <dd>{course.price === null ? copy.free : formatMoney(course.price, language)}</dd>
        </div>
        {course.payment !== null && (
          <div data-payment={course.payment}>
            <dt>{copy.paymentState}</dt>
            <dd>{t(`timeline.payment.${course.payment}`)}</dd>
          </div>
        )}
      </dl>
      <SheetActions {...props} />
    </article>
  );
}

function SheetActions({ course, timeline, roadmap, region, today }: SheetProps) {
  const { language } = useMessages();
  const copy = dashboardCopy[language];
  const payments = usePayments();
  const refundable = payments.data?.payments.some(
    (payment) => payment.courseId === course.id && payment.refundable,
  );
  return (
    <div className={styles.actions}>
      {course.kind === 'free' && (
        <a
          className={styles.textAction}
          href={course.url}
          target="_blank"
          rel="noopener noreferrer"
        >
          {copy.openAtProvider}
        </a>
      )}
      {course.kind === 'paid' && (course.payment === 'due' || course.payment === 'refunded') && (
        <>
          <PayFromBalance
            region={region}
            courseIds={[course.id]}
            total={course.price}
            label={copy.payWallet}
            onCompleted={() => undefined}
          />
          <ButtonLink to={`/${region}/courses/${course.id}`}>{copy.payPaypal}</ButtonLink>
        </>
      )}
      {course.enrolment === 'active' && (
        <ButtonLink primary to={`/learn/${course.id}`}>
          {copy.learn}
        </ButtonLink>
      )}
      {course.enrolment === 'completed' && (
        <ButtonLink to={`/learn/${course.id}`}>{copy.view}</ButtonLink>
      )}
      {refundable === true && (
        <Link to="?tab=payments" className={styles.textAction}>
          {copy.requestRefund}
        </Link>
      )}
      {removable(course) && (
        <RemoveModule
          course={course}
          timeline={timeline}
          roadmap={roadmap}
          region={region}
          today={today}
        />
      )}
    </div>
  );
}

/**
 * Takes a module out: a course the learner added leaves their roadmap; a course of the plan
 * itself is left out of it, and can be put back with "In plan".
 */
function RemoveModule({ course, timeline, roadmap, region, today }: SheetProps) {
  const { language } = useMessages();
  const copy = dashboardCopy[language];
  const path = usePathEdit(region);
  const plan = useSaveStudyPlan(region, timeline.isco08, today);
  const busy = path.isPending || plan.isPending;
  const error = path.error ?? plan.error;
  if (course.addedByLearner !== true && course.booking === null) {
    return null;
  }
  return (
    <>
      <Button
        disabled={busy}
        onClick={() => {
          if (course.addedByLearner === true) {
            path.mutate(withoutCourse(roadmap, course.id));
          } else {
            plan.mutate({ ...timeline.plan, leftOut: [...timeline.plan.leftOut, course.id] });
          }
        }}
      >
        {copy.removeModule}
      </Button>
      {error !== null && <ErrorNotice error={error} />}
    </>
  );
}
