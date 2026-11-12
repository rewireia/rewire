import type {
  CatalogueCourse,
  CourseCatalogue,
  Money,
  Region,
  StartedOrder,
} from '@rewire/contracts';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useState } from 'react';

import { useCourseCatalogue } from '../../api/courses-queries.ts';
import { usePaymentConfig } from '../../api/commerce-queries.ts';
import { api } from '../../api/instance.ts';
import { useActiveOffer } from '../../api/offers-queries.ts';
import { useSession } from '../../api/queries.ts';
import pageStyles from '../../app/Page.module.css';
import { usePreferences } from '../../app/preferences.ts';
import { DEMO_SELLER } from '../../app/seller.ts';
import { ButtonLink } from '../../components/Button.tsx';
import { QueryState } from '../../components/QueryState.tsx';
import { formatMoney } from '../../i18n/format.ts';
import { useMessages } from '../../i18n/use-messages.ts';
import { PayPalCheckout } from '../checkout/PayPalCheckout.tsx';
import { PayFromBalance } from '../marketplace/PayFromBalance.tsx';
import { SignIn } from '../dashboard/SignIn.tsx';
import { offerEnds, priceAt, totalsAt } from '../offers/offer-terms.ts';
import { OfferPrice } from '../offers/OfferPrice.tsx';
import { useOfferNow, useOffersNow } from '../offers/use-offer-now.ts';

import styles from './Cart.module.css';
import { CART_LIMIT } from './cart-store.ts';
import { Enrolment } from './Enrolment.tsx';
import { useCart } from './use-cart.ts';

/** `/cart`: the courses chosen in the catalogue, paid for in one PayPal Sandbox order. */
export function CartPage() {
  const { t, language } = useMessages();
  const { region } = usePreferences();
  const catalogue = useCourseCatalogue(region, language);
  // When the seller's offer starts, changes or ends, the catalogue and with it the total are read again.
  useActiveOffer(region);
  const [paid, setPaid] = useState<readonly CatalogueCourse[] | null>(null);
  return (
    <div className={pageStyles.page}>
      <header className={`navy ${styles.hero}`}>
        <span className={styles.eyebrow}>{t('cart.eyebrow')}</span>
        <h1>{t('cart.title')}</h1>
        <p className={styles.lede}>{t('cart.lede')}</p>
      </header>
      {paid === null ? (
        <QueryState query={catalogue} loadingLabel={t('cart.loading')}>
          {(data) => <CartView catalogue={data} onPaid={setPaid} />}
        </QueryState>
      ) : (
        <Enrolment courses={paid} />
      )}
    </div>
  );
}

interface CartViewProps {
  readonly catalogue: CourseCatalogue;
  readonly onPaid: (courses: readonly CatalogueCourse[]) => void;
}

function CartView({ catalogue, onPaid }: CartViewProps) {
  const { t } = useMessages();
  const cart = useCart(catalogue.region);
  const courses = useMemo(
    () => new Map(catalogue.courses.map((course) => [course.id, course])),
    [catalogue],
  );
  const gone = cart.ids.filter((id) => !courses.has(id));
  useEffect(() => {
    // A course no longer in the catalogue cannot be bought: it leaves the cart.
    if (gone.length > 0) cart.remove(gone);
  }, [cart, gone]);
  const lines = cart.ids.flatMap((id) => courses.get(id) ?? []);
  if (lines.length === 0) {
    return (
      <section className={styles.empty} aria-labelledby="cart-empty">
        <h2 id="cart-empty">{t('cart.empty.title')}</h2>
        <p>{t('cart.empty.body')}</p>
        <ButtonLink primary to="/courses">
          {t('cart.empty.cta')}
        </ButtonLink>
      </section>
    );
  }
  const payable = lines.filter((course) => course.enrolment === 'none');
  return (
    <div className={styles.layout}>
      <section className={styles.lines} aria-labelledby="cart-courses">
        <h2 id="cart-courses" className={styles.sectionTitle}>
          {t('cart.courses')} <span>{lines.length}</span>
        </h2>
        <ul>
          {lines.map((course) => (
            <CartLine
              key={course.id}
              course={course}
              onRemove={() => {
                cart.remove([course.id]);
              }}
            />
          ))}
        </ul>
      </section>
      <Summary
        region={catalogue.region}
        payable={payable}
        onPaid={(ids) => {
          cart.remove(ids);
          onPaid(lines.filter((course) => ids.includes(course.id)));
        }}
      />
    </div>
  );
}

function CartLine({
  course,
  onRemove,
}: {
  readonly course: CatalogueCourse;
  readonly onRemove: () => void;
}) {
  const { t, language } = useMessages();
  const now = useOfferNow(course.offer?.endsAt ?? null);
  const { price, offer } = priceAt(course, now);
  const enrolled = course.enrolment === 'active' || course.enrolment === 'completed';
  return (
    <li className={styles.line}>
      <div className={styles.lineText}>
        <span className={styles.provider}>{course.provider}</span>
        <h3>{course.title}</h3>
        {course.hours !== null && (
          <span className={styles.hours}>{t('courses.card.hours', { hours: course.hours })}</span>
        )}
        <span className={styles.seller}>{t('courses.seller', { seller: DEMO_SELLER })}</span>
        {enrolled && <p className={styles.lineNote}>{t('cart.line.enrolled')}</p>}
        {course.enrolment === 'payment-pending' && (
          <p className={styles.lineNote}>{t('cart.line.pending')}</p>
        )}
      </div>
      <div className={styles.lineEnd}>
        {offer === null ? (
          <strong className={styles.linePrice}>{formatMoney(price, language)}</strong>
        ) : (
          <OfferPrice price={price} offer={offer} now={now} size="line" />
        )}
        <button
          type="button"
          className={styles.remove}
          aria-label={t('cart.removeNamed', { title: course.title })}
          onClick={onRemove}
        >
          {t('cart.remove')}
        </button>
      </div>
    </li>
  );
}

interface SummaryProps {
  readonly region: Region;
  readonly payable: readonly CatalogueCourse[];
  readonly onPaid: (courseIds: readonly string[]) => void;
}

function Summary({ region, payable, onPaid }: SummaryProps) {
  const { t, language } = useMessages();
  const [opened, setOpened] = useState<Money | null>(null);
  const now = useOffersNow(offerEnds(payable));
  const { total, saving } = totalsAt(payable, now);
  return (
    <aside className={styles.summary} aria-labelledby="cart-summary">
      <h2 id="cart-summary" className={styles.sectionTitle}>
        {t('cart.summary')}
      </h2>
      <div className={styles.row}>
        <span>
          {payable.length === 1 ? t('cart.lines.one') : t('cart.lines', { count: payable.length })}
        </span>
        <span>{total === null ? '—' : formatMoney(total, language)}</span>
      </div>
      <div className={styles.total}>
        <strong>{t('cart.total')}</strong>
        <strong>{total === null ? '—' : formatMoney(total, language)}</strong>
      </div>
      {saving !== null && (
        <p className={styles.saving}>
          {t('offers.cart.saving', {
            amount: formatMoney(saving, language),
            seller: DEMO_SELLER,
          })}
        </p>
      )}
      <p className={styles.note}>{t(saving === null ? 'cart.totalNote' : 'offers.cart.server')}</p>
      {opened !== null && (
        <p className={styles.server} role="status">
          {t('cart.serverAmount', { amount: formatMoney(opened, language) })}
          {total !== null && opened.minorUnits !== total.minorUnits && (
            <span className={styles.differs}>{t('offers.cart.differs')}</span>
          )}
        </p>
      )}
      <p className={styles.sandbox}>{t('cart.sandbox')}</p>
      <p className={styles.note}>{t('cart.limit', { limit: CART_LIMIT })}</p>
      {payable.length === 0 ? (
        <p className={styles.nothing}>{t('cart.nothingToPay')}</p>
      ) : (
        <PayArea
          region={region}
          payable={payable}
          total={total}
          onOpened={setOpened}
          onPaid={onPaid}
        />
      )}
    </aside>
  );
}

interface PayAreaProps {
  readonly region: Region;
  readonly payable: readonly CatalogueCourse[];
  /** The total shown, at the prices in force now. */
  readonly total: Money | null;
  readonly onOpened: (amount: Money) => void;
  readonly onPaid: (courseIds: readonly string[]) => void;
}

/** The demo sign-in when it is missing, then the ways to pay, one under the other. */
function PayArea({ region, payable, total, onOpened, onPaid }: PayAreaProps) {
  const { t } = useMessages();
  const session = useSession();
  const client = useQueryClient();
  const config = usePaymentConfig(region);
  const order = useRef<readonly string[]>([]);
  if (session.isPending) {
    return null;
  }
  if (session.data?.authenticated !== true || session.data.accessRole !== 'learner') {
    return (
      <div className={styles.access}>
        <SignIn role="learner" />
      </div>
    );
  }
  const [first] = payable;
  if (first === undefined) {
    return null;
  }
  const courseIds = payable.map((course) => course.id);
  const createOrder = async (): Promise<StartedOrder> => {
    const started = await api.startOrder({ region, courseId: first.id, courseIds });
    order.current = courseIds;
    onOpened(started.amount);
    return started;
  };
  return (
    <section className={styles.methods} aria-labelledby="cart-pay">
      <h3 id="cart-pay">{t('cart.pay')}</h3>
      <QueryState query={config}>
        {(payment) =>
          payment.available ? (
            <PayPalCheckout
              config={payment}
              createOrder={createOrder}
              onCompleted={() => {
                void client.invalidateQueries({ queryKey: ['course-catalogue'] });
                onPaid(order.current);
              }}
            />
          ) : (
            <p className={styles.nothing}>{t('course.noPayments')}</p>
          )
        }
      </QueryState>
      <PayFromBalance
        region={region}
        courseIds={courseIds}
        {...(total === null ? {} : { total })}
        onCompleted={() => {
          void client.invalidateQueries({ queryKey: ['course-catalogue'] });
          onPaid(courseIds);
        }}
      />
    </section>
  );
}
