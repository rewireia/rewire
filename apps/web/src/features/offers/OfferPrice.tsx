import type { CatalogueOffer, Money } from '@rewire/contracts';

import { cx } from '../../components/cx.ts';
import { formatMoney } from '../../i18n/format.ts';
import { useMessages } from '../../i18n/use-messages.ts';

import { offerUntil } from './offer-terms.ts';
import styles from './OfferPrice.module.css';

interface OfferPriceProps {
  /** What is paid now, as the server quotes it. */
  readonly price: Money;
  readonly offer: CatalogueOffer;
  /** The instant the end of the offer is told against: "until 20:00" today. */
  readonly now: number;
  /** A course card gives the price room; a line of the cart keeps it compact. */
  readonly size: 'card' | 'line';
}

/**
 * A price on offer: the price paid now, the list price struck through, the discount and its end.
 * A screen reader hears it as one sentence rather than a struck-through figure.
 */
export function OfferPrice({ price, offer, now, size }: OfferPriceProps) {
  const { t, language } = useMessages();
  const shown = formatMoney(price, language);
  const list = formatMoney(offer.listPrice, language);
  const until = offerUntil(offer.endsAt, now, language);
  return (
    <span className={cx(styles.offer, size === 'line' && styles.line)}>
      <span className="visually-hidden">
        {t('offers.price.spoken', { price: shown, list, until })}
      </span>
      <span className={styles.figures} aria-hidden="true">
        <strong className={styles.amount}>{shown}</strong>
        <del className={styles.list}>{list}</del>
        <span className={styles.tag}>{t('offers.tag', { percent: offer.percent })}</span>
      </span>
      <span className={styles.until} aria-hidden="true">
        {t('offers.card.until', { until })}
      </span>
    </span>
  );
}
