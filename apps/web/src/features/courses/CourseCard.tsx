import type { CatalogueCourse, CourseTopic, Region } from '@rewire/contracts';
import { Link, useNavigate } from 'react-router';

import { Button } from '../../components/Button.tsx';
import { formatMoney } from '../../i18n/format.ts';
import { DEMO_SELLER } from '../../app/seller.ts';
import { useMessages } from '../../i18n/use-messages.ts';
import { CART_LIMIT } from '../cart/cart-store.ts';
import { useCart } from '../cart/use-cart.ts';
import { priceAt } from '../offers/offer-terms.ts';
import { OfferPrice } from '../offers/OfferPrice.tsx';
import { useOfferNow } from '../offers/use-offer-now.ts';

import styles from './CourseCard.module.css';

interface CourseCardProps {
  readonly region: Region;
  readonly course: CatalogueCourse;
  readonly topics: ReadonlyMap<string, CourseTopic>;
  /** Why Rex proposes it, in the model's words, when it gave a reason. */
  readonly reason?: string | null;
}

/** The topics a card names: the first three, as the catalogue labels them. */
const SHOWN_TOPICS = 3;

/** One course of the catalogue: who offers it, what it is, and how to take it. */
export function CourseCard({ region, course, topics, reason = null }: CourseCardProps) {
  const { t } = useMessages();
  const labels = course.topics
    .map((id) => topics.get(id)?.label)
    .filter((label): label is string => label !== undefined)
    .slice(0, SHOWN_TOPICS);
  return (
    <article className={styles.card} aria-labelledby={`course-${course.id}`}>
      <div className={styles.body}>
        <p className={styles.meta}>
          <span className={styles.provider}>{course.provider}</span>
          <span>{t(`courses.level.${course.level}`)}</span>
          {course.hours !== null && <span>{t('courses.card.hours', { hours: course.hours })}</span>}
          {course.languages.length > 0 && <span>{course.languages.join(' · ').toUpperCase()}</span>}
        </p>
        <h3 id={`course-${course.id}`} className={styles.title}>
          {course.kind === 'hosted' ? (
            <Link to={`/${region}/courses/${course.id}`}>{course.title}</Link>
          ) : (
            course.title
          )}
        </h3>
        {course.summary !== course.title && <p className={styles.summary}>{course.summary}</p>}
        {reason !== null && (
          <p className={styles.reason}>
            <span>{t('courses.rex.reason')}</span> {reason}
          </p>
        )}
        {labels.length > 0 && (
          <ul className={styles.topics} aria-label={t('courses.filter.topic')}>
            {labels.map((label) => (
              <li key={label}>{label}</li>
            ))}
          </ul>
        )}
      </div>
      <div className={styles.buy}>
        <CardPrice course={course} />
        <CardActions region={region} course={course} />
        <p className={styles.seller}>{t('courses.seller', { seller: DEMO_SELLER })}</p>
      </div>
    </article>
  );
}

/** The price paid now; while an offer runs, with the list price and the end of the offer. */
function CardPrice({ course }: { readonly course: CatalogueCourse }) {
  const { t, language } = useMessages();
  const now = useOfferNow(course.offer?.endsAt ?? null);
  const { price, offer } = priceAt(course, now);
  return (
    <div className={styles.price} data-offer={offer !== null}>
      <span className={styles.priceLabel}>
        {t(offer === null ? 'courses.card.price' : 'offers.card.label')}
      </span>
      {offer === null ? (
        <strong>{formatMoney(price, language)}</strong>
      ) : (
        <OfferPrice price={price} offer={offer} now={now} size="card" />
      )}
    </div>
  );
}

/** Enrolled, being paid, or the two ways to buy it. */
function CardActions({
  region,
  course,
}: {
  readonly region: Region;
  readonly course: CatalogueCourse;
}) {
  const { t } = useMessages();
  const navigate = useNavigate();
  const cart = useCart(region);
  if (course.enrolment === 'active' || course.enrolment === 'completed') {
    return (
      <div className={styles.actions}>
        <p className={styles.enrolled}>{t('courses.card.enrolled')}</p>
        <Link to={`/learn/${course.id}`} className={styles.open}>
          {t('courses.card.open')}
        </Link>
      </div>
    );
  }
  if (course.enrolment === 'payment-pending') {
    return <p className={styles.pending}>{t('courses.card.pending')}</p>;
  }
  const inCart = cart.has(course.id);
  const blocked = cart.full && !inCart;
  return (
    <div className={styles.actions}>
      {inCart ? (
        <Link to="/cart" className={styles.inCart}>
          {t('courses.card.inCart')}
        </Link>
      ) : (
        <Button
          disabled={blocked}
          onClick={() => {
            cart.add(course.id);
          }}
        >
          {t('courses.card.add')}
        </Button>
      )}
      <Button
        primary
        disabled={blocked}
        onClick={() => {
          cart.add(course.id);
          void navigate('/cart');
        }}
      >
        {t('courses.card.buy')}
      </Button>
      {blocked && <p className={styles.full}>{t('courses.card.full', { limit: CART_LIMIT })}</p>}
    </div>
  );
}
