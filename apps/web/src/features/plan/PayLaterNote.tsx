import type { CourseCard } from '@rewire/contracts';

import { useMessages } from '../../i18n/use-messages.ts';

import styles from './Plan.module.css';
import { payLaterOffers } from './pay-later.ts';

/** What PayPal documents for this price; whether it is offered is PayPal's decision. */
export function PayLaterNote({ hints }: { readonly hints: CourseCard['payLater'] }) {
  const { t, language } = useMessages();
  const offers = payLaterOffers(hints, language, (products, country) =>
    t('plan.payLater.offer', { products, country }),
  );
  if (offers === null) {
    return null;
  }
  return <p className={styles.small}>{t('plan.payLater', { offers })}</p>;
}
