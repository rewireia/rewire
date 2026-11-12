import {
  loadCoreSdkScript,
  type FindEligibleMethodsGetDetails,
  type SdkInstance,
} from '@paypal/paypal-js/sdk-v6';
import type { PaymentConfig } from '@rewire/contracts';
import { useEffect, useState } from 'react';

export type AvailablePayments = Extract<PaymentConfig, { available: true }>;
export type PayPalInstance = SdkInstance<readonly ['paypal-payments']>;
type PayLaterDetails = FindEligibleMethodsGetDetails<'paylater'>;

export type SdkState =
  | { readonly status: 'loading' }
  | { readonly status: 'failed' }
  | {
      readonly status: 'ready';
      readonly instance: PayPalInstance;
      readonly paypal: boolean;
      readonly payLater: PayLaterDetails | null;
    };

/** Beyond this, a script that has not answered counts as not loaded. */
const LOAD_TIMEOUT_MS = 15_000;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error('PayPal took too long to load'));
      }, ms);
    }),
  ]);
}

/** Loads PayPal's script, creates the instance and asks which buttons the buyer may see. */
async function loadInstance(config: AvailablePayments): Promise<SdkState> {
  // The environment, not the client id, decides which PayPal is loaded.
  const environment = config.environment === 'live' ? 'production' : 'sandbox';
  const paypal = await loadCoreSdkScript({ environment });
  if (paypal === null) {
    return { status: 'failed' };
  }
  const instance = await paypal.createInstance({
    clientId: config.clientId,
    components: ['paypal-payments'] as const,
    pageType: 'checkout',
  });
  const methods = await instance.findEligibleMethods({ currencyCode: config.currency });
  return {
    status: 'ready',
    instance,
    paypal: methods.isEligible('paypal'),
    payLater: methods.isEligible('paylater') ? methods.getDetails('paylater') : null,
  };
}

/** The PayPal JavaScript SDK v6 for a region's merchant, loaded once per configuration. */
export function usePayPalSdk(config: AvailablePayments): SdkState {
  const [state, setState] = useState<SdkState>({ status: 'loading' });
  useEffect(() => {
    let cancelled = false;
    withTimeout(loadInstance(config), LOAD_TIMEOUT_MS).then(
      (loaded) => {
        if (!cancelled) {
          setState(loaded);
        }
      },
      () => {
        if (!cancelled) {
          setState({ status: 'failed' });
        }
      },
    );
    return () => {
      cancelled = true;
    };
  }, [config]);
  return state;
}
