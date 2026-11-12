import type { Region } from '@rewire/contracts';
import { useState } from 'react';

import { useActiveOffer, type RunningOffer } from '../../api/offers-queries.ts';
import { DEMO_SELLER } from '../../app/seller.ts';
import { safeStorage } from '../../app/storage.ts';
import { Button, ButtonLink } from '../../components/Button.tsx';
import { useMessages } from '../../i18n/use-messages.ts';

import styles from './Offer.module.css';
import { createDismissals } from './offer-dismissal.ts';
import { beaconKey, OFFERS_PATH, offerUntil } from './offer-terms.ts';
import { useOfferNow } from './use-offer-now.ts';

const dismissals = createDismissals(safeStorage('localStorage'));

/**
 * The dashboard's notice while the seller's offer runs in the region: what it takes off, until
 * when, and on how many courses. "Not now" puts it aside for that beacon only.
 */
export function OfferAlert({ region }: { readonly region: Region }) {
  const offer = useActiveOffer(region);
  const [aside, setAside] = useState<string | null>(null);
  if (offer === null) {
    return null;
  }
  const key = beaconKey(offer);
  if (aside === key || dismissals.has(key)) {
    return null;
  }
  return (
    <OfferNotice
      offer={offer}
      onLater={() => {
        dismissals.add(key);
        setAside(key);
      }}
    />
  );
}

function OfferNotice({
  offer,
  onLater,
}: {
  readonly offer: RunningOffer;
  readonly onLater: () => void;
}) {
  const { t, language } = useMessages();
  const now = useOfferNow(offer.endsAt);
  const values = {
    count: offer.courses,
    percent: offer.percent,
    until: offerUntil(offer.endsAt, now, language),
  };
  return (
    <section className={styles.alert} role="status" aria-labelledby="offer-alert-title">
      <span className={styles.figure} aria-hidden="true">
        {t('offers.tag', { percent: offer.percent })}
      </span>
      <div className={styles.words}>
        <span className={styles.eyebrow}>{t('offers.alert.eyebrow', { seller: DEMO_SELLER })}</span>
        <h2 id="offer-alert-title" className={styles.title}>
          {t('offers.alert.title')}
        </h2>
        <p className={styles.text}>
          {t(offer.courses === 1 ? 'offers.alert.body.one' : 'offers.alert.body', values)}
        </p>
      </div>
      <div className={styles.actions}>
        <ButtonLink primary to={OFFERS_PATH}>
          {t('offers.alert.see')}
        </ButtonLink>
        <Button onClick={onLater}>{t('offers.alert.later')}</Button>
      </div>
    </section>
  );
}
