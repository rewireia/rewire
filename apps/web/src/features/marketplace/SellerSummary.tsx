import type { Currency, MarketCourse, MarketSales, MarketSalesTotal } from '@rewire/contracts';
import { useId, type ReactNode } from 'react';

import { RadialGauge } from '../../components/RadialGauge.tsx';
import { formatMoney } from '../../i18n/format.ts';
import { useMessages } from '../../i18n/use-messages.ts';

import styles from './Business.module.css';
import { bestSellers, totalsInOrder } from './business-figures.ts';
import { SalesChart } from './SalesChart.tsx';

interface SellerSummaryProps {
  readonly sales: MarketSales | undefined;
  readonly catalogue: readonly MarketCourse[] | undefined;
  readonly currency: Currency;
  /** When the sales were read, for the line that names their source. */
  readonly readAt: number;
}

/**
 * The seller's figures, first: what it kept, sold and gave back, the share of the catalogue on
 * sale, sales by day and the best sellers. Every figure is the server's; without sales, the
 * summary says so and shows none.
 */
export function SellerSummary({ sales, catalogue, currency, readAt }: SellerSummaryProps) {
  const { t, language } = useMessages();
  const totals = sales ? totalsInOrder(sales.totals, currency) : [];
  const [main] = totals;
  const time = new Intl.DateTimeFormat(language, { timeStyle: 'short' }).format(readAt);
  return (
    <section className={styles.summary} aria-label={t('business.summary')}>
      <div className={styles.figures}>
        {main === undefined ? (
          <p className={styles.emptyCard}>{sales ? t('business.empty') : '—'}</p>
        ) : (
          <Figures totals={totals} main={main} />
        )}
        <CatalogueGauge catalogue={catalogue} />
      </div>
      {sales && main !== undefined && (
        <div className={styles.insights}>
          <figure className={styles.card}>
            <figcaption className={styles.cardHead}>
              <h3>{t('business.chart')}</h3>
              <p>{t('business.chartNote', { currency: main.currency })}</p>
            </figcaption>
            <SalesChart sales={sales.sales} currency={main.currency} />
          </figure>
          <BestSellers sales={sales} />
        </div>
      )}
      {sales && <p className={styles.source}>{t('business.source', { time })}</p>}
    </section>
  );
}

function Figures({
  totals,
  main,
}: {
  readonly totals: readonly MarketSalesTotal[];
  readonly main: MarketSalesTotal;
}) {
  const { t, language } = useMessages();
  const money = (minorUnits: number, currency: Currency = main.currency) =>
    formatMoney({ minorUnits, currency }, language);
  return (
    <>
      <Figure tone="good" label={t('business.net')} value={money(main.netMinor)}>
        {t('business.netNote')}
        {totals.slice(1).map((other) => (
          <span key={other.currency} className={styles.other}>
            {money(other.netMinor, other.currency)}
          </span>
        ))}
        {main.reviewMinor > 0 && (
          <span className={styles.other}>
            {t('business.review', { amount: money(main.reviewMinor) })}
          </span>
        )}
      </Figure>
      <Figure tone="accent" label={t('business.sold')} value={String(main.sold)}>
        {t('business.soldNote')}
      </Figure>
      <Figure tone="error" label={t('business.refunds')} value={String(main.refunds)}>
        {main.refundedMinor > 0
          ? t('business.refundsNote', { amount: money(main.refundedMinor) })
          : t('business.refundsNone')}
      </Figure>
      <Figure
        tone="brass"
        label={t('business.average')}
        value={main.averageMinor === null ? '—' : money(main.averageMinor)}
      >
        {main.averageMinor === null ? t('business.noFigure') : t('business.averageNote')}
      </Figure>
    </>
  );
}

function Figure({
  tone,
  label,
  value,
  children,
}: {
  readonly tone: 'good' | 'accent' | 'error' | 'brass';
  readonly label: string;
  readonly value: string;
  readonly children: ReactNode;
}) {
  return (
    <figure className={styles.figure} data-tone={tone}>
      <span className={styles.figureLabel}>{label}</span>
      <strong className={styles.figureValue}>{value}</strong>
      <figcaption className={styles.figureNote}>{children}</figcaption>
    </figure>
  );
}

function CatalogueGauge({
  catalogue,
}: {
  readonly catalogue: readonly MarketCourse[] | undefined;
}) {
  const { t, language } = useMessages();
  const total = catalogue?.length ?? 0;
  const published = catalogue?.filter((course) => course.published).length ?? 0;
  const count = new Intl.NumberFormat(language);
  const caption = t('business.publishedCaption', {
    published: count.format(published),
    total: count.format(total),
  });
  return (
    <div className={styles.gaugeCard}>
      <RadialGauge
        label={t('business.publishedGauge')}
        value={total > 0 ? Math.round((published / total) * 100) : null}
        bands={[{ from: 0, to: 100, color: 'var(--accent)', label: caption }]}
        unit="%"
        caption={caption}
      />
    </div>
  );
}

function BestSellers({ sales }: { readonly sales: MarketSales }) {
  const { t } = useMessages();
  const heading = useId();
  const top = bestSellers(sales.sales);
  const most = top[0]?.sold ?? 1;
  return (
    <section className={styles.card} aria-labelledby={heading}>
      <div className={styles.cardHead}>
        <h3 id={heading}>{t('business.top')}</h3>
      </div>
      {top.length === 0 && <p className={styles.figureNote}>{t('business.noFigure')}</p>}
      <ol className={styles.top}>
        {top.map((course) => (
          <li key={course.courseId}>
            <span className={styles.topTitle}>{course.title}</span>
            <span className={styles.topMeta}>
              {course.provider ?? '—'} · {t('business.topCount', { count: course.sold })}
            </span>
            <span
              className={styles.topBar}
              style={{ inlineSize: `${(course.sold / most) * 100}%` }}
              aria-hidden="true"
            />
          </li>
        ))}
      </ol>
    </section>
  );
}
