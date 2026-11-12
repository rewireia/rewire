/**
 * The page every pay-later limit was read from, and the day it was read. The limits in the
 * profiles change only when they are read again from this page.
 */
export const PAY_LATER_SOURCE = {
  source: {
    title: 'PayPal Developer: Pay Later overview',
    url: 'https://developer.paypal.com/pay-later/overview',
  },
  checkedOn: '2026-11-11',
} as const;
