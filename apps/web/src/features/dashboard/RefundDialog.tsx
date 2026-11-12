import type { Payment } from '@rewire/contracts';

import { formatMoney } from '../../i18n/format.ts';
import { useMessages } from '../../i18n/use-messages.ts';

import { ConfirmDialog } from './ConfirmDialog.tsx';

interface RefundDialogProps {
  readonly payment: Payment | null;
  readonly days: number;
  readonly onCancel: () => void;
  readonly onConfirm: (payment: Payment) => void;
}

/** Asks before a refund: what goes back, what is lost, and the window of the guarantee. */
export function RefundDialog({ payment, days, onCancel, onConfirm }: RefundDialogProps) {
  const { t, language } = useMessages();
  return (
    <ConfirmDialog
      open={payment !== null}
      title={t('refund.title')}
      body={
        payment === null
          ? ''
          : t('refund.body', {
              amount: formatMoney(payment.amount, language),
              course: payment.courseTitle,
              days,
            })
      }
      confirmLabel={t('refund.confirm')}
      cancelLabel={t('refund.cancel')}
      onCancel={onCancel}
      onConfirm={() => {
        if (payment !== null) {
          onConfirm(payment);
        }
      }}
    />
  );
}
