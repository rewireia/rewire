import type { GuideCard, Region } from '@rewire/contracts';
import { Link, useNavigate } from 'react-router';

import { usePaymentConfig } from '../../api/commerce-queries.ts';
import { formatDate, formatMoney } from '../../i18n/format.ts';
import { useMessages } from '../../i18n/use-messages.ts';
import { PayPalCheckout } from '../checkout/PayPalCheckout.tsx';
import { confirmPath, reportPath } from '../occupation/links.ts';
import { CourseCardView } from '../plan/CourseCardView.tsx';

import styles from './Guide.module.css';

type CheckoutCard = Extract<GuideCard, { type: 'checkout' }>;

/** The order the guide opened: the same PayPal button, started with that order. */
function Checkout({ region, card }: { readonly region: Region; readonly card: CheckoutCard }) {
  const { t, language } = useMessages();
  const navigate = useNavigate();
  const config = usePaymentConfig(region);
  return (
    <div className={styles.card}>
      <span className={styles.label}>{t('guide.card.checkout')}</span>
      <p lang="en">{card.courseTitle}</p>
      <p className={styles.price}>{formatMoney(card.order.amount, language)}</p>
      {config.data?.available === true && (
        <PayPalCheckout
          config={config.data}
          createOrder={() => Promise.resolve(card.order)}
          onCompleted={() => {
            void navigate(`/learn/${card.courseId}`);
          }}
        />
      )}
    </div>
  );
}

type PlanInTimeCard = Extract<GuideCard, { type: 'plan' }>;

/** The plan in time as the guide left it, with the way to see it. */
function PlanCard({ region, card }: { readonly region: Region; readonly card: PlanInTimeCard }) {
  const { t, language } = useMessages();
  return (
    <div className={styles.card}>
      <span className={styles.label}>
        {t(card.changed ? 'guide.card.planChanged' : 'guide.card.plan')}
      </span>
      <p>{t('guide.card.planStarts', { date: formatDate(card.startsOn, language) })}</p>
      <p>
        {card.finishesOn === null
          ? t('timeline.summary.empty')
          : t('timeline.summary.finishes', {
              hours: card.hoursPerWeek,
              date: formatDate(card.finishesOn, language),
            })}
      </p>
      <Link to={`/${region}/plan/${card.isco08}`}>{t('guide.card.planOpen')}</Link>
    </div>
  );
}

type ReportCard = Extract<GuideCard, { type: 'report' }>;

/** The report the guide read: its headline figures from the ILO index, and the way to it. */
function Report({ region, card }: { readonly region: Region; readonly card: ReportCard }) {
  const { t, points } = useMessages();
  return (
    <div className={styles.card}>
      <Link to={reportPath(region, card.isco08)}>
        {t('guide.card.report', { title: card.title })}
      </Link>
      <ul className={styles.figures}>
        <li>{t('guide.card.reportMean', { score: points(card.meanScore) })}</li>
        <li>{t('guide.card.reportLevel', { level: t(`gradient.${card.gradient}`) })}</li>
        <li>
          {t('guide.card.reportStanding', {
            rank: card.standing.moreExposed + 1,
            total: card.standing.outOf,
          })}
        </li>
      </ul>
    </div>
  );
}

/** What the guide found or prepared, shown under its answer: every number it has to show. */
export function GuideCards({
  region,
  cards,
}: {
  readonly region: Region;
  readonly cards: readonly GuideCard[];
}) {
  const { t } = useMessages();
  return cards.map((card, index) => {
    // Cards come in the order of the answer and never move: their place is their key.
    const key = `${card.type}-${index}`;
    switch (card.type) {
      case 'occupations':
        return (
          <div key={key} className={styles.card}>
            <span className={styles.label}>{t('guide.card.occupations')}</span>
            <ul className={styles.cardList}>
              {card.matches.map((match) => (
                <li key={`${match.occupation.code}-${match.unitGroup?.isco08 ?? ''}`}>
                  <Link to={confirmPath(region, match)}>{match.occupation.title}</Link>
                </li>
              ))}
            </ul>
          </div>
        );
      case 'report':
        return <Report key={key} region={region} card={card} />;
      case 'courses':
        return (
          <div key={key} className={styles.cards}>
            {card.courses.map((course) => (
              <CourseCardView key={course.id} region={region} course={course} compact />
            ))}
          </div>
        );
      case 'plan':
        return <PlanCard key={key} region={region} card={card} />;
      case 'checkout':
        return <Checkout key={key} region={region} card={card} />;
    }
  });
}
