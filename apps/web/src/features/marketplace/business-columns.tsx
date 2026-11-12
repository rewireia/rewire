import type { MarketCourse, MarketSale } from '@rewire/contracts';
import type { ColDef } from 'ag-grid-community';
import { useMemo } from 'react';

import { NARROW_SCREEN, useMediaQuery } from '../../components/use-media-query.ts';
import { formatDay, formatMoney } from '../../i18n/format.ts';
import { useMessages, type Messages } from '../../i18n/use-messages.ts';

import styles from './Business.module.css';

/** A sandbox price typed in a cell, in minor units, or null when it is not a valid price. */
export function typedPrice(value: unknown): number | null {
  if (value === null || value === '') return null;
  const minor = Math.round(Number(value) * 100);
  return Number.isFinite(minor) && minor >= 100 && minor <= 100_000 ? minor : null;
}

/** CSS Module class names, which Vite types as possibly absent, as AG Grid takes them. */
const classes = (...names: (string | undefined)[]) =>
  names.filter((name): name is string => name !== undefined);

const TONES: Readonly<Record<MarketSale['status'], string>> = {
  completed: 'good',
  pending: 'warn',
  refunded: 'error',
};

/** What every column factory needs: the texts, and whether the screen is a phone's. */
interface Context extends Messages {
  readonly narrow: boolean;
}

const orDash = (value: unknown) => (typeof value === 'string' ? value : '—');

/** What went back of a sale, in words, or nothing when nothing did. */
function refundedText(sale: MarketSale, t: Messages['t'], language: Messages['language']) {
  if (sale.refundedMinor === 0) return '';
  const amount = formatMoney(
    { minorUnits: sale.refundedMinor, currency: sale.amount.currency },
    language,
  );
  return `${t('business.refunded')} ${amount}`;
}

function courseColumn({ t, narrow }: Context, open: (course: MarketCourse) => void) {
  return {
    colId: 'title',
    field: 'title',
    headerName: t('business.course'),
    flex: 3,
    minWidth: narrow ? 190 : 240,
    // A phone shows the provider, and a withdrawn course, under the title.
    cellRenderer: ({ data }: { data?: MarketCourse }) =>
      data && (
        <span className={styles.courseCell}>
          <button
            type="button"
            className={styles.courseLink}
            title={data.title}
            aria-label={t('business.edit', { title: data.title })}
            onClick={() => {
              open(data);
            }}
          >
            {data.title}
          </button>
          {narrow && (
            <span className={styles.courseMeta}>
              {data.published ? data.provider : `${data.provider} · ${t('business.withdrawn')}`}
            </span>
          )}
        </span>
      ),
  } satisfies ColDef<MarketCourse>;
}

/** Who wrote the course and what it is: provider, type, languages and hours. */
function aboutColumns({ t, narrow }: Context): ColDef<MarketCourse>[] {
  return [
    {
      field: 'provider',
      headerName: t('business.provider'),
      flex: 1.4,
      minWidth: 150,
      hide: narrow,
    },
    {
      field: 'kind',
      headerName: t('business.kind'),
      minWidth: 100,
      hide: narrow,
      valueFormatter: ({ value }) =>
        t(value === 'hosted' ? 'business.kind.hosted' : 'business.kind.listed'),
    },
    {
      colId: 'languages',
      headerName: t('business.languages'),
      minWidth: 100,
      hide: narrow,
      valueGetter: ({ data }) => data?.languages.map((code) => code.toUpperCase()).join(' · '),
    },
    {
      field: 'hours',
      headerName: t('business.hours'),
      minWidth: 80,
      hide: narrow,
      cellClass: classes(styles.figureCell),
      valueFormatter: ({ value }) => (typeof value === 'number' ? String(value) : '—'),
    },
  ];
}

/** The terms: the one sandbox price, edited in its cell, and whether the course is on sale. */
function termsColumns({ t, language, narrow }: Context): ColDef<MarketCourse>[] {
  const money = (minorUnits: number, course: MarketCourse) =>
    formatMoney({ minorUnits, currency: course.currency }, language);
  // The seller sets the list price; a running beacon takes its percentage off it for everyone.
  const listPrice = (course: MarketCourse) =>
    course.offer?.listPrice.minorUnits ?? course.priceMinor;
  return [
    {
      colId: 'price',
      headerName: t('business.price'),
      minWidth: narrow ? 96 : 130,
      editable: true,
      cellEditor: 'agNumberCellEditor',
      cellEditorParams: { min: 1, max: 1000, precision: 2 },
      cellClass: classes(styles.figureCell, styles.editable),
      valueGetter: ({ data }) => (data ? listPrice(data) / 100 : null),
      valueFormatter: ({ data }) => (data ? money(listPrice(data), data) : ''),
    },
    {
      field: 'published',
      headerName: t('business.published'),
      minWidth: 200,
      hide: narrow,
      cellDataType: false,
      getQuickFilterText: ({ value }) => t(value ? 'business.onSale' : 'business.withdrawn'),
      cellRenderer: ({ data }: { data?: MarketCourse }) =>
        data && (
          <span className={styles.chips}>
            <span className={styles.chip} data-tone={data.published ? 'good' : 'muted'}>
              {t(data.published ? 'business.onSale' : 'business.withdrawn')}
            </span>
            {data.offer && (
              <span className={styles.chip} data-tone="warn">
                {t('business.offerChip', { percent: data.offer.percent })}
              </span>
            )}
          </span>
        ),
    },
  ];
}

/** The catalogue's columns. The course opens its terms; the price is edited in its cell. */
export function useCatalogueColumns(open: (course: MarketCourse) => void) {
  const messages = useMessages();
  const narrow = useMediaQuery(NARROW_SCREEN);
  return useMemo<ColDef<MarketCourse>[]>(() => {
    const context = { ...messages, narrow };
    return [courseColumn(context, open), ...aboutColumns(context), ...termsColumns(context)];
  }, [messages, narrow, open]);
}

/** When and what was sold, and to whom: always the demo learner, never personal data. */
function soldColumns({ t, language, narrow }: Context): ColDef<MarketSale>[] {
  return [
    {
      field: 'createdAt',
      headerName: t('business.date'),
      minWidth: 130,
      hide: narrow,
      sort: 'desc',
      valueFormatter: ({ value }) => formatDay(String(value), language),
    },
    {
      field: 'title',
      headerName: t('business.course'),
      flex: 2.4,
      minWidth: narrow ? 130 : 220,
      // A phone shows under the course the day of the sale and what went back of it.
      cellRenderer: ({ data }: { data?: MarketSale }) =>
        data && (
          <span className={styles.courseCell}>
            <span className={styles.saleTitle} title={data.title}>
              {data.title}
            </span>
            {narrow && (
              <span className={styles.courseMeta}>
                {[formatDay(data.createdAt, language), refundedText(data, t, language)]
                  .filter((part) => part !== '')
                  .join(' · ')}
              </span>
            )}
          </span>
        ),
    },
    {
      field: 'provider',
      headerName: t('business.provider'),
      flex: 1.2,
      minWidth: 160,
      hide: narrow,
      valueFormatter: ({ value }) => orDash(value),
    },
    {
      colId: 'buyer',
      headerName: t('business.buyer'),
      minWidth: 170,
      hide: narrow,
      sortable: false,
      valueGetter: () => t('business.demoBuyer'),
    },
  ];
}

const METHODS = {
  paypal: 'business.method.paypal',
  wallet: 'business.method.wallet',
  'employer-invoice': 'business.method.employer-invoice',
} as const;

/** How it was paid, for how much, what went back, where it stands and PayPal's reference. */
function paidColumns({ t, language, narrow }: Context): ColDef<MarketSale>[] {
  return [
    {
      field: 'method',
      headerName: t('business.method'),
      minWidth: 160,
      hide: narrow,
      valueFormatter: ({ data }) => (data ? t(METHODS[data.method]) : ''),
    },
    {
      colId: 'amount',
      headerName: t('business.amount'),
      minWidth: narrow ? 84 : 120,
      cellClass: classes(styles.figureCell),
      valueGetter: ({ data }) => data?.amount.minorUnits,
      valueFormatter: ({ data }) => (data ? formatMoney(data.amount, language) : ''),
    },
    {
      field: 'refundedMinor',
      headerName: t('business.refunded'),
      minWidth: 120,
      hide: narrow,
      cellClass: classes(styles.figureCell),
      valueFormatter: ({ data }) =>
        data && data.refundedMinor > 0
          ? formatMoney(
              { minorUnits: data.refundedMinor, currency: data.amount.currency },
              language,
            )
          : '—',
    },
    {
      field: 'status',
      headerName: t('business.status'),
      minWidth: narrow ? 100 : 130,
      getQuickFilterText: ({ data }) => t(`business.sale.${data.status}`),
      cellRenderer: ({ data }: { data?: MarketSale }) =>
        data && (
          <span className={styles.chip} data-tone={TONES[data.status]}>
            {t(`business.sale.${data.status}`)}
          </span>
        ),
    },
    {
      field: 'paypalReference',
      headerName: t('business.reference'),
      minWidth: 200,
      hide: narrow,
      cellClass: classes(styles.referenceCell),
      valueFormatter: ({ value }) => orDash(value),
    },
  ];
}

/** The sales columns: one line per course sold, with the money as the ledger keeps it. */
export function useSalesColumns() {
  const messages = useMessages();
  const narrow = useMediaQuery(NARROW_SCREEN);
  return useMemo<ColDef<MarketSale>[]>(() => {
    const context = { ...messages, narrow };
    return [...soldColumns(context), ...paidColumns(context)];
  }, [messages, narrow]);
}
