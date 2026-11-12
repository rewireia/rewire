import type { Payment } from '@rewire/contracts';
import type { AgGridReact } from 'ag-grid-react';
import { useMemo, useRef, useState, type RefObject } from 'react';

import { usePayments, useRefreshPayment, useRefundPayment } from '../../api/commerce-queries.ts';
import pageStyles from '../../app/Page.module.css';
import { Button } from '../../components/Button.tsx';
import { ErrorNotice } from '../../components/ErrorNotice.tsx';
import { QueryState } from '../../components/QueryState.tsx';
import { useMessages } from '../../i18n/use-messages.ts';

import { dashboardCopy } from './dashboard-copy.ts';

import styles from './Dashboard.module.css';
import { DashboardGrid } from './DashboardGrid.tsx';
import {
  PAYMENT_EXPORT_COLUMNS,
  paymentColumns,
  paymentRow,
  totalRow,
  type PaymentGridContext,
  type PaymentRow,
} from './payment-columns.tsx';
import { paymentTotals } from './payment-totals.ts';
import { RefundDialog } from './RefundDialog.tsx';
import { useBusy } from './use-busy.ts';

interface SectionProps {
  readonly filter: string;
  readonly narrow: boolean;
}

/** A payment the refunds view lists: refunded, or with a refund under way. */
const isRefund = (payment: Payment) =>
  payment.status === 'refunded' || payment.refund === 'requested';

/** Refunds, after the dialog, and checking a pending payment again, row by row. */
function usePaymentActions() {
  const refund = useRefundPayment();
  const refresh = useRefreshPayment();
  const { busy, run } = useBusy();
  const [refunding, setRefunding] = useState<Payment | null>(null);
  const check = refresh.mutateAsync;
  const context = useMemo<PaymentGridContext>(
    () => ({
      onRefund: setRefunding,
      onCheck: (payment) => {
        run(payment.orderId, check(payment.orderId));
      },
    }),
    [run, check],
  );
  const confirmRefund = (payment: Payment) => {
    setRefunding(null);
    run(payment.orderId, refund.mutateAsync(payment.orderId));
  };
  return { context, busy, refund, refresh, refunding, setRefunding, confirmRefund };
}

interface PaymentsTableProps extends SectionProps {
  readonly payments: readonly Payment[];
  readonly busy: ReadonlySet<string>;
  readonly context: PaymentGridContext;
  readonly grid: RefObject<AgGridReact<PaymentRow> | null>;
}

/** The table, with the totals of each currency pinned at its foot. */
function PaymentsTable({ payments, busy, context, grid, filter, narrow }: PaymentsTableProps) {
  const messages = useMessages();
  const columns = useMemo(() => paymentColumns(messages, narrow), [messages, narrow]);
  const rows = useMemo(
    () => payments.map((payment) => paymentRow(payment, busy.has(payment.orderId))),
    [payments, busy],
  );
  const totals = useMemo(() => paymentTotals(payments).map(totalRow), [payments]);
  return (
    <DashboardGrid<PaymentRow, PaymentGridContext>
      gridRef={grid}
      label={messages.t('dashboard.payments')}
      rows={rows}
      pinnedBottom={totals}
      columns={columns}
      quickFilter={filter}
      getRowId={({ data }) => data.id}
      context={context}
    />
  );
}

/** The title and the empty state of the payments, or of the refunds. */
function useSectionWords(refundsOnly: boolean) {
  const { t, language } = useMessages();
  const copy = dashboardCopy[language];
  return refundsOnly
    ? { title: copy.refunds, empty: copy.noRefunds }
    : { title: t('dashboard.payments'), empty: t('dashboard.payments.empty') };
}

/**
 * "My payments": every order, the totals of each currency, refunds and a CSV of the history;
 * or, as "My refunds", only the payments refunded or being refunded.
 */
export function PaymentsSection({
  filter,
  narrow,
  refundsOnly,
}: SectionProps & { readonly refundsOnly: boolean }) {
  const { t } = useMessages();
  const words = useSectionWords(refundsOnly);
  const payments = usePayments();
  const actions = usePaymentActions();
  const { refund, refresh, refunding, setRefunding, confirmRefund } = actions;
  const grid = useRef<AgGridReact<PaymentRow>>(null);
  return (
    <section className={pageStyles.section} aria-labelledby="dashboard-payments">
      <div className={styles.sectionHead}>
        <h2 id="dashboard-payments">{words.title}</h2>
        {payments.data !== undefined && payments.data.payments.length > 0 && (
          <ExportButton grid={grid} />
        )}
      </div>
      <QueryState query={payments}>
        {({ payments: all, refundWindowDays }) => {
          const rows = refundsOnly ? all.filter(isRefund) : all;
          return (
            <>
              <p className={styles.small}>
                {t('dashboard.payments.window', { days: refundWindowDays })}
              </p>
              {rows.length === 0 ? (
                <p className={styles.empty}>{words.empty}</p>
              ) : (
                <PaymentsTable
                  payments={rows}
                  busy={actions.busy}
                  context={actions.context}
                  grid={grid}
                  filter={filter}
                  narrow={narrow}
                />
              )}
              <RefundDialog
                payment={refunding}
                days={refundWindowDays}
                onCancel={() => {
                  setRefunding(null);
                }}
                onConfirm={confirmRefund}
              />
            </>
          );
        }}
      </QueryState>
      {/* The live region is on the page before its words, so they are announced. */}
      <p role="status" className={styles.status}>
        {refund.isSuccess ? t('refund.done') : ''}
      </p>
      {refund.isError && <ErrorNotice error={refund.error} />}
      {refresh.isError && <ErrorNotice error={refresh.error} />}
    </section>
  );
}

/** Downloads the history as CSV, with the amounts and states as the table shows them. */
function ExportButton({ grid }: { readonly grid: RefObject<AgGridReact<PaymentRow> | null> }) {
  const { t } = useMessages();
  return (
    <Button
      onClick={() => {
        grid.current?.api.exportDataAsCsv({
          fileName: 'rewire-payments.csv',
          columnKeys: PAYMENT_EXPORT_COLUMNS,
        });
      }}
    >
      {t('dashboard.payments.export')}
    </Button>
  );
}
