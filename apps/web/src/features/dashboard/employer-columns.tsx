import type { Sponsorship } from '@rewire/contracts';
import type { ColDef, ICellRendererParams } from 'ag-grid-community';

import { shownAs } from '../../components/grid-columns.ts';
import { formatDay, formatMoney } from '../../i18n/format.ts';
import { useMessages, type Messages } from '../../i18n/use-messages.ts';

import styles from './Dashboard.module.css';
import { compareMoney } from './payment-totals.ts';

/** A request to the employer, with whether an action on it is on its way. */
export interface EmployerRow extends Sponsorship {
  readonly busy: boolean;
}

/** What the action cells of "Requests to my employer" can do. */
export interface EmployerGridContext {
  readonly onCheck: (sponsorship: Sponsorship) => void;
  readonly onCancel: (sponsorship: Sponsorship) => void;
}

/** A paid invoice whose amount PayPal reports differently is checked before the course opens. */
const statusKey = (row: EmployerRow) =>
  row.inReview === true ? 'sponsor.status.review' : (`sponsor.status.${row.status}` as const);

/** A request still out: checking it again, its payment page and cancelling it. */
function EmployerActions({
  data,
  context,
}: ICellRendererParams<EmployerRow, unknown, EmployerGridContext>) {
  const { t } = useMessages();
  if (data?.status !== 'sent') {
    return null;
  }
  return (
    <span className={styles.actions}>
      <button
        type="button"
        className={styles.action}
        disabled={data.busy}
        onClick={() => {
          context.onCheck(data);
        }}
      >
        {t('action.check')}
      </button>
      {data.payUrl !== null && (
        <a className={styles.action} href={data.payUrl} target="_blank" rel="noreferrer">
          {t('action.pay')}
        </a>
      )}
      <button
        type="button"
        className={styles.action}
        disabled={data.busy}
        onClick={() => {
          context.onCancel(data);
        }}
      >
        {t('action.cancelRequest')}
      </button>
    </span>
  );
}

/** The columns of "Requests to my employer". */
export function employerColumns({ t, language }: Messages, narrow: boolean): ColDef<EmployerRow>[] {
  return [
    {
      field: 'invoiceNumber',
      headerName: t('col.invoice'),
      cellClass: 'mono',
      width: 150,
      hide: narrow,
    },
    {
      field: 'courseTitle',
      headerName: t('col.course'),
      flex: 2,
      minWidth: narrow ? 100 : 160,
      wrapText: true,
      autoHeight: true,
    },
    {
      colId: 'amount',
      headerName: t('col.amount'),
      valueGetter: ({ data }) => data?.amount ?? null,
      ...shownAs((data) => (data === undefined ? '' : formatMoney(data.amount, language))),
      comparator: compareMoney,
      cellClass: 'mono',
      width: 120,
      hide: narrow,
    },
    {
      field: 'sentAt',
      headerName: t('col.date'),
      ...shownAs((data) => (data === undefined ? '' : formatDay(data.sentAt, language))),
      initialSort: 'desc',
      width: 130,
      hide: narrow,
    },
    {
      field: 'status',
      headerName: t('col.status'),
      ...shownAs((data) => (data === undefined ? '' : t(statusKey(data)))),
      width: narrow ? 104 : 150,
      wrapText: true,
      autoHeight: true,
    },
    {
      colId: 'action',
      headerName: t('col.action'),
      cellRenderer: EmployerActions,
      sortable: false,
      width: narrow ? 130 : 330,
      wrapText: true,
      autoHeight: true,
    },
  ];
}
