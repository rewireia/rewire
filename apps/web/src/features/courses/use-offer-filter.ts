import { useEffect } from 'react';
import { useLocation, useSearchParams } from 'react-router';

import type { RunningOffer } from '../../api/offers-queries.ts';
import { BROWSE_ANCHOR, OFFER_PARAM } from '../offers/offer-terms.ts';

/**
 * Whether only the courses on offer are shown: asked for in the address, so the offers of the
 * dashboard and of the band above lead here, and only while an offer runs.
 */
export function useOfferFilter(offer: RunningOffer | null) {
  const [params, setParams] = useSearchParams();
  const { hash } = useLocation();
  const asked = params.get(OFFER_PARAM) === '1';
  const ready = offer !== null && asked;
  useEffect(() => {
    // Coming from elsewhere, the courses were not drawn yet when the page tried to scroll.
    if (ready && hash === `#${BROWSE_ANCHOR}`) {
      document.getElementById(BROWSE_ANCHOR)?.scrollIntoView({ block: 'start' });
    }
  }, [ready, hash]);
  const set = (onOffer: boolean) => {
    setParams(
      (previous) => {
        const next = new URLSearchParams(previous);
        if (onOffer) next.set(OFFER_PARAM, '1');
        else next.delete(OFFER_PARAM);
        return next;
      },
      { replace: true, preventScrollReset: true },
    );
  };
  return { onOffer: ready, set };
}
