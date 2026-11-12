import { regionSchema, type CourseCard, type Region } from '@rewire/contracts';
import { Link, useNavigate, useParams } from 'react-router';

import { useCourse, usePaymentConfig, usePayments } from '../../api/commerce-queries.ts';
import { api } from '../../api/instance.ts';
import { NotFoundPage } from '../../app/NotFoundPage.tsx';
import pageStyles from '../../app/Page.module.css';
import { usePreferences } from '../../app/preferences.ts';
import { ButtonLink } from '../../components/Button.tsx';
import { QueryState } from '../../components/QueryState.tsx';
import { formatMoney } from '../../i18n/format.ts';
import { useMessages } from '../../i18n/use-messages.ts';
import { PayPalCheckout } from '../checkout/PayPalCheckout.tsx';
import { PayFromBalance } from '../marketplace/PayFromBalance.tsx';

import styles from './Course.module.css';
import { CourseFacts } from './CourseFacts.tsx';
import { EmployerRequest } from './EmployerRequest.tsx';

/** `/:region/courses/:courseId`: a course of the catalogue and the two ways to pay for it. */
export function CoursePage() {
  const params = useParams();
  const region = regionSchema.safeParse(params.region);
  const courseId = params.courseId ?? '';
  const course = useCourse(region.data ?? 'us', courseId);
  if (!region.success || courseId === '') {
    return <NotFoundPage />;
  }
  return (
    <div className={pageStyles.page}>
      <QueryState query={course}>
        {(data) => <CourseView region={region.data} course={data} />}
      </QueryState>
    </div>
  );
}

function CourseView({ region, course }: { readonly region: Region; readonly course: CourseCard }) {
  const { t } = useMessages();
  const { occupation } = usePreferences();
  const plan = occupation === null ? '/start' : `/${region}/plan/${occupation.isco08}`;
  const enrolled = course.enrolment === 'active' || course.enrolment === 'completed';
  return (
    <>
      <header className={pageStyles.intro}>
        <Link to={plan} className={styles.back}>
          {occupation === null ? t('course.toHome') : t('course.back')}
        </Link>
        <span className={styles.demo}>{t('course.demo')}</span>
        <h1 lang="en">{course.title}</h1>
        <p className={pageStyles.lede} lang="en">
          {course.summary}
        </p>
        <p className={styles.small}>{t('course.demoNote')}</p>
      </header>
      <CourseFacts course={course} />
      {enrolled && (
        <section className={pageStyles.section} aria-labelledby="course-enrolled">
          <h2 id="course-enrolled">{t('course.enrolledTitle')}</h2>
          <p>{t('course.enrolledNote')}</p>
          <div>
            <ButtonLink primary to={`/learn/${course.id}`}>
              {t('course.continue')}
            </ButtonLink>
          </div>
        </section>
      )}
      {course.enrolment === 'payment-pending' && (
        <section className={pageStyles.section}>
          <p>{t('course.pendingNote')}</p>
        </section>
      )}
      {course.enrolment === 'none' && (
        <div className={styles.ways}>
          <PayWithPayPal region={region} course={course} />
          <EmployerRequest region={region} course={course} />
        </div>
      )}
    </>
  );
}

function PayWithPayPal({
  region,
  course,
}: {
  readonly region: Region;
  readonly course: CourseCard;
}) {
  const { t, language } = useMessages();
  const navigate = useNavigate();
  const config = usePaymentConfig(region);
  const payments = usePayments();
  const days = payments.data?.refundWindowDays;
  return (
    <section className={styles.way} aria-labelledby="course-paypal">
      <h2 id="course-paypal">{t('course.payTitle')}</h2>
      <p className={styles.price}>{formatMoney(course.price, language)}</p>
      <p className={styles.small}>{t('course.priceNote')}</p>
      {days !== undefined && <p className={styles.small}>{t('course.refundNote', { days })}</p>}
      <p className={styles.small}>{t('course.browserNote')}</p>
      <QueryState query={config}>
        {(payment) =>
          payment.available ? (
            <PayPalCheckout
              config={payment}
              createOrder={() => api.startOrder({ courseId: course.id, region })}
              onCompleted={() => {
                void navigate(`/learn/${course.id}`);
              }}
            />
          ) : (
            <p className={styles.notice}>{t('course.noPayments')}</p>
          )
        }
      </QueryState>
      <PayFromBalance
        region={region}
        courseIds={[course.id]}
        total={course.price}
        onCompleted={() => {
          void navigate(`/learn/${course.id}`);
        }}
      />
    </section>
  );
}
