import type { Payment, Region, WalletMovement } from '@rewire/contracts';
import { Link } from 'react-router';

import { usePayments } from '../../api/commerce-queries.ts';
import { useWalletMovements } from '../../api/wallet-queries.ts';
import { DEMO_SELLER } from '../../app/seller.ts';
import { QueryState } from '../../components/QueryState.tsx';
import { formatDay, formatMoney, interpolate } from '../../i18n/format.ts';
import { useMessages } from '../../i18n/use-messages.ts';
import { dashboardCopy } from './dashboard-copy.ts';
import { recentActivity, type ActivityEntry } from './recent-activity.ts';
import styles from './Overview.module.css';

/** How many entries the overview lists; the payment and refund tabs have them all. */
const ENTRIES_SHOWN = 5;

/** Payments, refunds and top-ups, newest first, with the way to their tabs. */
export function RecentActivity({ region }: { readonly region: Region }) {
  const { language } = useMessages();
  const copy = dashboardCopy[language];
  const payments = usePayments();
  const movements = useWalletMovements(region);
  return (
    <section className={styles.card} aria-labelledby="dashboard-activity">
      <header className={styles.cardHead}>
        <p className={styles.eyebrow}>{copy.tabs[2]}</p>
        <h2 id="dashboard-activity">{copy.activity}</h2>
      </header>
      <QueryState query={payments}>
        {({ payments: rows }) => (
          <ActivityList payments={rows} movements={movements.data?.movements ?? []} />
        )}
      </QueryState>
      <div className={styles.links}>
        <Link to="?tab=payments" className={styles.more}>
          {copy.allPayments}
        </Link>
        <Link to="?tab=refunds" className={styles.more}>
          {copy.allRefunds}
        </Link>
      </div>
    </section>
  );
}

function ActivityList({
  payments,
  movements,
}: {
  readonly payments: readonly Payment[];
  readonly movements: readonly WalletMovement[];
}) {
  const { language } = useMessages();
  const copy = dashboardCopy[language];
  const entries = recentActivity(payments, movements, ENTRIES_SHOWN);
  if (entries.length === 0) {
    return <p className={styles.quiet}>{copy.noActivity}</p>;
  }
  return (
    <ul className={styles.lines}>
      {entries.map((entry) => (
        <ActivityLine key={entry.id} entry={entry} />
      ))}
    </ul>
  );
}

function ActivityLine({ entry }: { readonly entry: ActivityEntry }) {
  const { language } = useMessages();
  const copy = dashboardCopy[language];
  const label =
    entry.kind === 'top-up'
      ? copy.topUp
      : entry.kind === 'refund'
        ? copy.refundBack
        : interpolate(copy.paidTo, { seller: DEMO_SELLER }, language);
  const amount = formatMoney(
    { currency: entry.currency, minorUnits: Math.abs(entry.amountMinor) },
    language,
  );
  return (
    <li
      className={styles.line}
      data-sign={entry.amountMinor < 0 ? 'out' : 'in'}
      data-outcome={entry.outcome}
    >
      <span className={styles.dot} aria-hidden="true" />
      <span className={styles.lineText}>
        <span>{entry.title ?? label}</span>
        <span className={styles.lineMeta}>
          {entry.title === null ? '' : `${label} · `}
          {formatDay(entry.at, language)} · {copy.outcome[entry.outcome]}
        </span>
      </span>
      <strong>
        {entry.outcome === 'failed' ? '' : entry.amountMinor > 0 ? '+' : '−'}
        {amount}
      </strong>
    </li>
  );
}
