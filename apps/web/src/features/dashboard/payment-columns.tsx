import type { Payment } from '@rewire/contracts';
import type { ColDef, ICellRendererParams } from 'ag-grid-community';

import { shownAs } from '../../components/grid-columns.ts';
import { formatDay, formatMoney } from '../../i18n/format.ts';
import { useMessages, type Messages } from '../../i18n/use-messages.ts';

import styles from './Dashboard.module.css';
import { dashboardCopy } from './dashboard-copy.ts';
import { compareMoney, type CurrencyTotal } from './payment-totals.ts';

/**
 * A line of "My payments": a payment, with whether an action on it is on its way, or the total
 * of one currency, pinned at the foot.
 */
export type PaymentRow =
  | {
      readonly kind: 'payment';
      readonly id: string;
      readonly payment: Payment;
      readonly busy: boolean;
    }
  | { readonly kind: 'total'; readonly id: string; readonly total: CurrencyTotal };

/** What the action cells of "My payments" can do. */
export interface PaymentGridContext {
  readonly onRefund: (payment: Payment) => void;
  readonly onCheck: (payment: Payment) => void;
}

export function paymentRow(payment: Payment, busy: boolean): PaymentRow {
  return { kind: 'payment', id: payment.orderId, payment, busy };
}

export function totalRow(total: CurrencyTotal): PaymentRow {
  return { kind: 'total', id: `total-${total.currency}`, total };
}

const paymentOf = (row: PaymentRow | undefined): Payment | undefined =>
  row?.kind === 'payment' ? row.payment : undefined;

function PaymentActions({
  data,
  context,
}: ICellRendererParams<PaymentRow, unknown, PaymentGridContext>) {
  const { t } = useMessages();
  if (data?.kind !== 'payment') {
    return null;
  }
  const { payment, busy } = data;
  // A refund PayPal has not completed yet is checked again, like a payment under review.
  const waiting =
    payment.status === 'pending' || payment.status === 'created' || payment.refund === 'requested';
  if (!payment.refundable && !waiting) {
    return null;
  }
  return (
    <button
      type="button"
      className={styles.action}
      disabled={busy}
      onClick={() => {
        if (payment.refundable) {
          context.onRefund(payment);
        } else {
          context.onCheck(payment);
        }
      }}
    >
      {t(payment.refundable ? 'action.refund' : 'action.check')}
    </button>
  );
}

/** The words of a line in the columns a total shares with payments. */
function texts({ t, language }: Messages, narrow: boolean) {
  const refunded = (total: CurrencyTotal) =>
    t('dashboard.payments.refundedTotal', { amount: formatMoney(total.refunded, language) });
  return {
    date: (row: PaymentRow | undefined): string => {
      const payment = paymentOf(row);
      return payment === undefined ? '' : formatDay(payment.createdAt, language);
    },
    course: (row: PaymentRow | undefined): string => {
      if (row?.kind !== 'total') {
        return paymentOf(row)?.courseTitle ?? '';
      }
      const label = t('dashboard.payments.total', { currency: row.total.currency });
      // On a narrow screen the status column is hidden, so the refunds go with the label.
      return narrow ? `${label} · ${refunded(row.total)}` : label;
    },
    amount: (row: PaymentRow | undefined): string => {
      const money = row?.kind === 'total' ? row.total.paid : paymentOf(row)?.amount;
      return money === undefined ? '' : formatMoney(money, language);
    },
    status: (row: PaymentRow | undefined): string => {
      if (row?.kind === 'total') {
        return refunded(row.total);
      }
      const payment = paymentOf(row);
      if (payment === undefined) {
        return '';
      }
      return t(
        payment.refund === 'requested' ? 'order.refundRequested' : `order.${payment.status}`,
      );
    },
  };
}

/** The columns of "My payments". The reference is PayPal's, as the payer's account shows it. */
export function paymentColumns(messages: Messages, narrow: boolean): ColDef<PaymentRow>[] {
  const { t } = messages;
  const text = texts(messages, narrow);
  return [
    {
      colId: 'createdAt',
      headerName: t('col.date'),
      valueGetter: ({ data }) => paymentOf(data)?.createdAt ?? '',
      ...shownAs(text.date),
      initialSort: 'desc',
      width: 130,
      hide: narrow,
    },
    {
      colId: 'courseTitle',
      headerName: t('col.course'),
      valueGetter: ({ data }) => text.course(data),
      flex: 2,
      minWidth: narrow ? 110 : 160,
      wrapText: true,
      autoHeight: true,
    },
    {
      colId: 'method',
      headerName: t('col.method'),
      valueGetter: ({ data }) => {
        const payment = paymentOf(data);
        return payment === undefined ? '' : t(`method.${payment.method}`);
      },
      width: 150,
      hide: narrow,
    },
    sellerColumn(messages, narrow),
    {
      colId: 'amount',
      headerName: t('col.amount'),
      valueGetter: ({ data }) =>
        data?.kind === 'total' ? data.total.paid : (paymentOf(data)?.amount ?? null),
      ...shownAs(text.amount),
      comparator: compareMoney,
      cellClass: 'mono',
      width: narrow ? 84 : 120,
    },
    {
      colId: 'status',
      headerName: t('col.status'),
      valueGetter: ({ data }) => (data?.kind === 'total' ? '' : (paymentOf(data)?.status ?? '')),
      ...shownAs(text.status),
      // Wide enough for the refunds of a total in Spanish: "0 US$ reembolsados".
      width: 170,
      hide: narrow,
    },
    ...referenceAndAction(t, narrow),
  ];
}

/** Who sold the course, as the server records it. */
function sellerColumn(messages: Messages, narrow: boolean): ColDef<PaymentRow> {
  return {
    colId: 'seller',
    headerName: dashboardCopy[messages.language].seller,
    valueGetter: ({ data }) => paymentOf(data)?.seller ?? '',
    valueFormatter: ({ value, data }) =>
      data?.kind === 'total' ? '' : typeof value === 'string' && value !== '' ? value : '—',
    width: 140,
    hide: narrow,
  };
}

/** PayPal's reference of each payment, and what the learner can do with it. */
function referenceAndAction(t: Messages['t'], narrow: boolean): ColDef<PaymentRow>[] {
  return [
    {
      colId: 'paypalReference',
      headerName: t('col.reference'),
      valueGetter: ({ data }) => paymentOf(data)?.paypalReference ?? null,
      valueFormatter: ({ value, data }) =>
        data?.kind === 'total' ? '' : typeof value === 'string' ? value : '—',
      cellClass: 'mono',
      width: 190,
      hide: narrow,
    },
    {
      colId: 'action',
      headerName: t('col.action'),
      cellRenderer: PaymentActions,
      sortable: false,
      width: narrow ? 104 : 140,
    },
  ];
}

/** The columns exported to CSV: every one except the actions. */
export const PAYMENT_EXPORT_COLUMNS = [
  'createdAt',
  'courseTitle',
  'method',
  'seller',
  'amount',
  'status',
  'paypalReference',
];
