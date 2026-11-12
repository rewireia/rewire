/** The wallet: money added with PayPal, courses paid from the balance, and its movements. */
export const walletEn = {
  'wallet.eyebrow': 'WALLET · PAYPAL SANDBOX',
  'wallet.title': 'Your wallet',
  'wallet.body':
    'Add money with PayPal and pay for courses from your balance. Rex finds courses within your balance; you approve every payment.',
  'wallet.sandbox': 'PayPal Sandbox: no real money moves.',
  'wallet.available': 'Available to spend',
  'wallet.funded': 'Added with PayPal',
  'wallet.spent': 'Spent on courses',
  'wallet.add': 'Add funds',
  'wallet.addBody':
    'Choose an amount, then approve it in PayPal. It counts once PayPal confirms it.',
  'wallet.amount': 'Amount to add',
  'wallet.other': 'Other',
  'wallet.otherAmount': 'Other amount in {currency}',
  'wallet.limits': 'From {minimum} to {maximum}.',
  'wallet.added': '{amount} added to your wallet.',
  'wallet.movements': 'Movements',
  'wallet.noMovements': 'No movements yet. Money you add with PayPal shows here.',
  'wallet.kind.top-up': 'Added with PayPal',
  'wallet.kind.course-payment': 'Paid from balance',
  'wallet.kind.refund': 'Refund to balance',
  'wallet.status.pending': 'Held by PayPal',
  'wallet.status.completed': 'Done',
  'wallet.status.failed': 'Declined',
  'wallet.status.mismatched': 'Being returned',
  'wallet.status.refunded': 'Returned to PayPal',
  'wallet.reference': 'PayPal reference',
  'wallet.outcome.completed': 'Money received. It is in your wallet.',
  'wallet.outcome.held':
    'PayPal is reviewing this payment. It is added to your wallet as soon as it clears.',
  'wallet.outcome.review':
    'PayPal answered, but {brand} could not confirm this payment yet. Nothing is added until it is checked. Do not pay again.',
  'wallet.outcome.failed': 'The payment did not go through. Nothing was charged.',
  'wallet.outcome.mismatch':
    'The payment did not match the amount asked, so nothing was added. The money goes back to your PayPal account.',
  'wallet.outcome.not-approved': 'PayPal has not received your approval yet. Nothing was charged.',
  'wallet.outcome.refunded': 'This payment went back to your PayPal account. Nothing was added.',
  'wallet.pay': 'Pay {amount} from your balance',
  'wallet.payPlain': 'Pay from your balance',
  'wallet.paying': 'Paying from your balance',
  'wallet.paid': 'Paid from your balance. Your courses are open.',
  'wallet.short': 'Your balance of {available} does not cover {amount}.',
  'wallet.topUpLink': 'Add funds to your wallet',
  'wallet.orPayPal': 'Or pay the whole amount with PayPal',
  'method.wallet': 'Wallet balance',
  'problem.insufficient_balance':
    'Your wallet does not have enough money for this. Add funds with PayPal, then pay again.',
  'problem.sandbox_required': 'The wallet works with PayPal Sandbox only.',
} as const;

export type WalletCatalogue = Readonly<Record<keyof typeof walletEn, string>>;
