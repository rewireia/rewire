import type { Region, RoadmapCourse } from '@rewire/contracts';
import { Link } from 'react-router';

import { usePayments } from '../../api/commerce-queries.ts';
import { Button, ButtonLink } from '../../components/Button.tsx';
import { ErrorNotice } from '../../components/ErrorNotice.tsx';
import { useMessages } from '../../i18n/use-messages.ts';
import { PayFromBalance } from '../marketplace/PayFromBalance.tsx';
import { dashboardCopy } from './dashboard-copy.ts';
import { withoutCourse } from './roadmap-edit.ts';
import { usePathEdit } from './use-path-edit.ts';
import styles from './ControlPanel.module.css';

/**
 * What can be done with a course of the plan, by its state: pay for it from the wallet or with
 * PayPal, take it out while it is not bought, continue it, or ask for a refund within the window.
 */
export function RoadmapActions({
  course,
  courses,
  region,
}: {
  readonly course: RoadmapCourse;
  readonly courses: readonly RoadmapCourse[];
  readonly region: Region;
}) {
  const { language } = useMessages();
  const copy = dashboardCopy[language];
  const remove = usePathEdit(region);
  const payments = usePayments();
  const refundable = payments.data?.payments.some(
    (payment) => payment.courseId === course.courseId && payment.refundable,
  );
  const page = `/${region}/courses/${course.courseId}`;
  if (course.status !== 'selected') {
    return (
      <div className={styles.cardActions}>
        <ButtonLink to={course.status === 'revoked' ? page : `/learn/${course.courseId}`}>
          {course.status === 'active' ? copy.learn : copy.view}
        </ButtonLink>
        {refundable === true && (
          <Link to="?tab=payments" className={styles.textAction}>
            {copy.requestRefund}
          </Link>
        )}
      </div>
    );
  }
  const kept = withoutCourse(courses, course.courseId);
  return (
    <div className={styles.cardActions} data-wrap="">
      <PayFromBalance
        region={region}
        courseIds={[course.courseId]}
        total={course.price}
        label={copy.payWallet}
        onCompleted={() => undefined}
      />
      <ButtonLink to={page}>{copy.payPaypal}</ButtonLink>
      <Button
        disabled={remove.isPending}
        onClick={() => {
          remove.mutate(kept);
        }}
      >
        {copy.remove}
      </Button>
      {remove.isError && <ErrorNotice error={remove.error} />}
    </div>
  );
}
