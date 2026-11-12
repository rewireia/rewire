import type { RunningOffer } from '../../api/offers-queries.ts';
import { DEMO_SELLER } from '../../app/seller.ts';
import { ButtonLink } from '../../components/Button.tsx';
import { useMessages } from '../../i18n/use-messages.ts';

import styles from './Offer.module.css';
import { OFFERS_PATH, offerUntil } from './offer-terms.ts';
import { useOfferNow } from './use-offer-now.ts';

/** The quiet band of `/courses` while the seller's offer runs, with the way to its courses. */
export function OfferBand({ offer }: { readonly offer: RunningOffer }) {
  const { t, language } = useMessages();
  const now = useOfferNow(offer.endsAt);
  const values = {
    seller: DEMO_SELLER,
    count: offer.courses,
    percent: offer.percent,
    until: offerUntil(offer.endsAt, now, language),
  };
  return (
    <aside className={styles.band} aria-label={t('offers.band.eyebrow')}>
      <span className={styles.figure} aria-hidden="true">
        {t('offers.tag', { percent: offer.percent })}
      </span>
      <p className={styles.text}>
        {t(offer.courses === 1 ? 'offers.band.text.one' : 'offers.band.text', values)}
      </p>
      <ButtonLink to={OFFERS_PATH}>{t('offers.band.cta')}</ButtonLink>
    </aside>
  );
}
