import type { PayPalButtonElement, PayPalPayLaterButtonElement } from '@paypal/paypal-js/sdk-v6';
import type { DetailedHTMLProps, HTMLAttributes } from 'react';

type CustomElement<T> = DetailedHTMLProps<HTMLAttributes<T>, T>;

/** The PayPal web components in JSX: the SDK types them for the DOM only. */
declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'paypal-button': CustomElement<PayPalButtonElement> & {
        type?: PayPalButtonElement['type'];
        disabled?: boolean;
      };
      'paypal-pay-later-button': CustomElement<PayPalPayLaterButtonElement> & {
        countryCode?: PayPalPayLaterButtonElement['countryCode'];
        productCode?: PayPalPayLaterButtonElement['productCode'];
        disabled?: boolean;
      };
    }
  }
}
