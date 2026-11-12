import type { Region } from '@rewire/contracts';
import { useState } from 'react';

import { usePaymentConfig } from '../../api/commerce-queries.ts';
import { useMediaQuery } from '../../components/use-media-query.ts';
import { useMessages } from '../../i18n/use-messages.ts';
import { dashboardCopy } from './dashboard-copy.ts';
import styles from './Dashboard.module.css';
import { EmployerSection } from './EmployerSection.tsx';
import { PaymentsSection } from './PaymentsSection.tsx';

/** Narrow enough to keep only the columns that matter on a phone. */
const NARROW = '(max-width: 720px)';

/**
 * "Payments" and "Refunds": the AG Grid tables of the learner's money, with one filter over
 * them. Payments also lists the invoices sent to an employer through PayPal Invoicing.
 */
export function PaymentsTab({
  region,
  refundsOnly = false,
}: {
  readonly region: Region;
  readonly refundsOnly?: boolean;
}) {
  const { language, t } = useMessages();
  const copy = dashboardCopy[language];
  const [filter, setFilter] = useState('');
  const narrow = useMediaQuery(NARROW);
  const config = usePaymentConfig(region);
  return (
    <>
      <div className={styles.sectionHead}>
        <label className={styles.filter}>
          <span>{t('dashboard.filter')}</span>
          <input
            type="search"
            value={filter}
            onChange={(event) => {
              setFilter(event.target.value);
            }}
          />
        </label>
        {config.data?.available === true && config.data.environment === 'sandbox' && (
          <p className={styles.sandbox}>{copy.sandbox}</p>
        )}
      </div>
      <PaymentsSection filter={filter} narrow={narrow} refundsOnly={refundsOnly} />
      {!refundsOnly && <EmployerSection filter={filter} narrow={narrow} />}
    </>
  );
}
