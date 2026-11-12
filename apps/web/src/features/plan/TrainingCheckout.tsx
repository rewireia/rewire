import type { Money, Region, TrainingCourse } from '@rewire/contracts';
import { api } from '../../api/instance.ts';
import { usePaymentConfig } from '../../api/commerce-queries.ts';
import { Button } from '../../components/Button.tsx';
import { QueryState } from '../../components/QueryState.tsx';
import { useMessages } from '../../i18n/use-messages.ts';
import { formatMoney } from '../../i18n/format.ts';
import { PayPalCheckout } from '../checkout/PayPalCheckout.tsx';
import { PayFromBalance } from '../marketplace/PayFromBalance.tsx';
import styles from './TrainingCheckout.module.css';

interface Props {
  readonly region: Region;
  readonly courses: TrainingCourse[];
  readonly onBack: () => void;
  readonly onCompleted: () => void;
}
export function TrainingCheckout({ region, courses, onBack, onCompleted }: Props) {
  const { language } = useMessages();
  const es = language === 'es';
  const first = courses[0];
  if (!first) return null;
  const amount = {
    currency: first.currency,
    minorUnits: courses.reduce((sum, course) => sum + course.priceMinor, 0),
  };
  const total = formatMoney(amount, language);
  const courseIds = courses.map((course) => course.courseId);
  return (
    <section className={styles.checkout}>
      <header className={styles.header}>
        <div>
          <span>{es ? 'TU FORMACIÓN' : 'YOUR LEARNING'}</span>
          <h2>{es ? 'Finalizar compra' : 'Checkout'}</h2>
        </div>
        <Button onClick={onBack}>← {es ? 'Editar selección' : 'Edit selection'}</Button>
      </header>
      <div className={styles.layout}>
        <div className={styles.order}>
          <h3>
            {es ? 'Tus cursos' : 'Your courses'} <span>{courses.length}</span>
          </h3>
          {courses.map((course) => (
            <CheckoutLine key={course.courseId} course={course} />
          ))}
          <Delivery />
        </div>
        <aside className={styles.summary}>
          <h3>{es ? 'Resumen del pedido' : 'Order summary'}</h3>
          <div className={styles.line}>
            <span>
              {courses.length} {es ? 'cursos digitales' : 'digital courses'}
            </span>
            <span>{total}</span>
          </div>
          <div className={styles.total}>
            <strong>Total</strong>
            <strong>{total}</strong>
          </div>
          <p className={styles.note}>
            {es
              ? 'Un único pago. El importe final es el mostrado.'
              : 'One payment. The final amount is shown above.'}
          </p>
          <CheckoutPayment
            region={region}
            courseIds={courseIds}
            amount={amount}
            onCompleted={onCompleted}
          />
        </aside>
      </div>
    </section>
  );
}
/** Where the courses are once paid. */
function Delivery() {
  const es = useMessages().language === 'es';
  return (
    <div className={styles.delivery}>
      <strong>{es ? 'Todo en tu cuenta' : 'All in your account'}</strong>
      <p>
        {es
          ? 'Tras confirmar el pago, encontrarás tus cursos en tu panel y en tu hoja de ruta.'
          : 'After payment is confirmed, find your courses in your dashboard and learning roadmap.'}
      </p>
    </div>
  );
}
/** Paying from the wallet first; or the whole amount with PayPal. */
function CheckoutPayment({
  region,
  courseIds,
  amount,
  onCompleted,
}: {
  readonly region: Region;
  readonly courseIds: string[];
  readonly amount: Money;
  readonly onCompleted: () => void;
}) {
  const { t } = useMessages();
  const config = usePaymentConfig(region);
  const [first] = courseIds;
  if (first === undefined) return null;
  return (
    <>
      <PayFromBalance
        region={region}
        courseIds={courseIds}
        total={amount}
        onCompleted={onCompleted}
      />
      <p className={styles.note}>{t('wallet.orPayPal')}</p>
      <QueryState query={config}>
        {(payment) =>
          payment.available ? (
            <PayPalCheckout
              config={payment}
              createOrder={() => api.startOrder({ region, courseId: first, courseIds })}
              onCompleted={onCompleted}
            />
          ) : (
            <p>{t('course.noPayments')}</p>
          )
        }
      </QueryState>
    </>
  );
}
function CheckoutLine({ course }: { readonly course: TrainingCourse }) {
  const { language } = useMessages();
  const month = { understand: 0, apply: 1, strengthen: 2 }[course.stage];
  return (
    <article className={styles.course}>
      <div className={styles.cover} aria-hidden="true">
        <svg viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M7 10h11l2 3 2-3h11v23H22l-2 2-2-2H7zM20 14v18M11 17h5m-5 5h5m8-5h5m-5 5h5" />
        </svg>
      </div>
      <div>
        <span className={styles.date}>
          {new Intl.DateTimeFormat(language, {
            month: 'long',
            year: 'numeric',
            timeZone: 'UTC',
          }).format(new Date(Date.UTC(2027, month, 1)))}
        </span>
        <h4>{course.title}</h4>
        <p>
          {course.hours} h · {language === 'es' ? 'Curso demo' : 'Demo course'}
        </p>
      </div>
      <strong>
        {formatMoney({ currency: course.currency, minorUnits: course.priceMinor }, language)}
      </strong>
    </article>
  );
}
