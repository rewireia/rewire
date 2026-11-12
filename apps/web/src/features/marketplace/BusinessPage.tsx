import { REGION_PROFILES } from '@rewire/content';
import type { MarketSale, Region } from '@rewire/contracts';
import { useMemo, useState } from 'react';

import { useCatalogue, useSales } from '../../api/marketplace-queries.ts';
import { useSession } from '../../api/queries.ts';
import pageStyles from '../../app/Page.module.css';
import { usePreferences } from '../../app/preferences.ts';
import { DEMO_SELLER } from '../../app/seller.ts';
import { QueryState } from '../../components/QueryState.tsx';
import type { MessageKey } from '../../i18n/en.ts';
import { useMessages } from '../../i18n/use-messages.ts';
import { SignIn, SignOut } from '../dashboard/SignIn.tsx';

import { BeaconPanel } from './BeaconPanel.tsx';
import styles from './Business.module.css';
import { useSalesColumns } from './business-columns.tsx';
import { SearchField, SellerCatalogue } from './SellerCatalogue.tsx';
import { SellerCourseForm } from './SellerCourseForm.tsx';
import { SellerGrid } from './SellerGrid.tsx';
import { SellerSummary } from './SellerSummary.tsx';

const TABS = ['summary', 'courses', 'publish', 'sales', 'refunds', 'beacons'] as const;
type Tab = (typeof TABS)[number];

const TAB_NAMES: Readonly<Record<Tab, MessageKey>> = {
  summary: 'business.tab.summary',
  courses: 'business.tab.courses',
  publish: 'business.tab.publish',
  sales: 'business.tab.sales',
  refunds: 'business.tab.refunds',
  beacons: 'business.tab.beacons',
};

/** The seller workspace of the demonstration seller, for the business role. */
export function BusinessPage() {
  const { t } = useMessages();
  const { region } = usePreferences();
  const session = useSession();
  return (
    <div className={`${pageStyles.page} ${styles.page}`}>
      <header className={styles.header}>
        <span className={styles.eyebrow}>{t('business.eyebrow', { seller: DEMO_SELLER })}</span>
        <h1>{t('business.title')}</h1>
        <p>{t('business.lede', { seller: DEMO_SELLER })}</p>
        {session.data?.authenticated && (
          <div className={styles.signOut}>
            <SignOut />
          </div>
        )}
      </header>
      <QueryState query={session}>
        {(data) =>
          data.authenticated && data.accessRole === 'business' ? (
            <SellerWorkspace region={region} />
          ) : (
            <div className={styles.card}>
              <p>{t('business.signIn')}</p>
              <SignIn role="business" />
            </div>
          )
        }
      </QueryState>
    </div>
  );
}

function SellerWorkspace({ region }: { readonly region: Region }) {
  const { t } = useMessages();
  const [tab, setTab] = useState<Tab>('summary');
  return (
    <>
      <nav className={styles.tabs} aria-label={t('business.view')}>
        {TABS.map((name) => (
          <button
            key={name}
            type="button"
            className={styles.tab}
            aria-pressed={tab === name}
            onClick={() => {
              setTab(name);
            }}
          >
            {t(TAB_NAMES[name])}
          </button>
        ))}
      </nav>
      {tab === 'summary' ? (
        <Summary region={region} />
      ) : (
        <section className={styles.workspace}>
          <div className={styles.workspaceHead}>
            <h2>{t(TAB_NAMES[tab])}</h2>
          </div>
          <TabView tab={tab} region={region} />
        </section>
      )}
    </>
  );
}

function Summary({ region }: { readonly region: Region }) {
  const catalogue = useCatalogue(region);
  const sales = useSales();
  return (
    <SellerSummary
      sales={sales.data}
      catalogue={catalogue.data?.courses}
      currency={REGION_PROFILES[region].currency}
      readAt={sales.dataUpdatedAt}
    />
  );
}

function TabView({ tab, region }: { readonly tab: Exclude<Tab, 'summary'>; region: Region }) {
  const catalogue = useCatalogue(region);
  const sales = useSales();
  switch (tab) {
    case 'courses':
      return (
        <QueryState query={catalogue}>
          {({ courses }) => <SellerCatalogue region={region} courses={courses} />}
        </QueryState>
      );
    case 'publish':
      return <SellerCourseForm region={region} />;
    case 'beacons':
      return <BeaconPanel region={region} />;
    case 'sales':
    case 'refunds':
      return (
        <QueryState query={sales}>
          {({ sales: rows }) => <SellerSales rows={rows} refunds={tab === 'refunds'} />}
        </QueryState>
      );
  }
}

/** The sales, one line per course sold; or only those given back, in full or in part. */
function SellerSales({
  rows,
  refunds,
}: {
  readonly rows: readonly MarketSale[];
  readonly refunds: boolean;
}) {
  const { t } = useMessages();
  const columns = useSalesColumns();
  const [text, setText] = useState('');
  const shown = useMemo(
    () => (refunds ? rows.filter((sale) => sale.refundedMinor > 0) : rows),
    [rows, refunds],
  );
  if (shown.length === 0) {
    return (
      <p className={styles.emptyCard}>{t(refunds ? 'business.refundsEmpty' : 'business.empty')}</p>
    );
  }
  return (
    <div className={styles.view}>
      <div className={styles.viewHead}>
        <p>{t(refunds ? 'business.refundsIntro' : 'business.salesIntro')}</p>
      </div>
      <div className={styles.filters}>
        <SearchField text={text} setText={setText} />
      </div>
      <SellerGrid<MarketSale>
        label={t(refunds ? 'business.tab.refunds' : 'business.sales')}
        rows={shown}
        columns={columns}
        quickFilter={text}
        getRowId={({ data }) => data.id}
      />
    </div>
  );
}
