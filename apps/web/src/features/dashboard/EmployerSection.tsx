import type { Sponsorship } from '@rewire/contracts';
import { useMemo, useState } from 'react';

import {
  useCancelSponsorship,
  useRefreshSponsorship,
  useSponsorships,
} from '../../api/commerce-queries.ts';
import pageStyles from '../../app/Page.module.css';
import { ErrorNotice } from '../../components/ErrorNotice.tsx';
import { QueryState } from '../../components/QueryState.tsx';
import { useMessages } from '../../i18n/use-messages.ts';

import { ConfirmDialog } from './ConfirmDialog.tsx';
import styles from './Dashboard.module.css';
import { DashboardGrid } from './DashboardGrid.tsx';
import {
  employerColumns,
  type EmployerGridContext,
  type EmployerRow,
} from './employer-columns.tsx';
import { useBusy } from './use-busy.ts';

interface SectionProps {
  readonly filter: string;
  readonly narrow: boolean;
}

/** Checking a request again and, after a confirmation, cancelling it, row by row. */
function useEmployerActions() {
  const refresh = useRefreshSponsorship();
  const cancel = useCancelSponsorship();
  const { busy, run } = useBusy();
  const [cancelling, setCancelling] = useState<Sponsorship | null>(null);
  const check = refresh.mutateAsync;
  const context = useMemo<EmployerGridContext>(
    () => ({
      onCheck: (sponsorship) => {
        run(sponsorship.id, check(sponsorship.id));
      },
      onCancel: setCancelling,
    }),
    [run, check],
  );
  const confirmCancel = () => {
    if (cancelling !== null) {
      run(cancelling.id, cancel.mutateAsync(cancelling.id));
    }
    setCancelling(null);
  };
  return { context, busy, refresh, cancel, cancelling, setCancelling, confirmCancel };
}

interface EmployerTableProps extends SectionProps {
  readonly sponsorships: readonly Sponsorship[];
  readonly busy: ReadonlySet<string>;
  readonly context: EmployerGridContext;
}

/** The table; a request waiting on an action is a new row, so its buttons wait at once. */
function EmployerTable({ sponsorships, busy, context, filter, narrow }: EmployerTableProps) {
  const messages = useMessages();
  const columns = useMemo(() => employerColumns(messages, narrow), [messages, narrow]);
  const rows = useMemo<EmployerRow[]>(
    () => sponsorships.map((sponsorship) => ({ ...sponsorship, busy: busy.has(sponsorship.id) })),
    [sponsorships, busy],
  );
  return (
    <DashboardGrid<EmployerRow, EmployerGridContext>
      label={messages.t('dashboard.employer')}
      rows={rows}
      columns={columns}
      quickFilter={filter}
      getRowId={({ data }) => data.id}
      context={context}
    />
  );
}

/** "Requests to my employer": each invoice, its status, its payment page and its withdrawal. */
export function EmployerSection({ filter, narrow }: SectionProps) {
  const { t } = useMessages();
  const sponsorships = useSponsorships();
  const { context, busy, refresh, cancel, cancelling, setCancelling, confirmCancel } =
    useEmployerActions();
  return (
    <section className={pageStyles.section} aria-labelledby="dashboard-employer">
      <h2 id="dashboard-employer">{t('dashboard.employer')}</h2>
      <QueryState query={sponsorships}>
        {({ sponsorships: rows }) =>
          rows.length === 0 ? (
            <p className={styles.empty}>{t('dashboard.employer.empty')}</p>
          ) : (
            <EmployerTable
              sponsorships={rows}
              busy={busy}
              context={context}
              filter={filter}
              narrow={narrow}
            />
          )
        }
      </QueryState>
      <ConfirmDialog
        open={cancelling !== null}
        title={t('cancelRequest.title')}
        body={t('cancelRequest.body')}
        confirmLabel={t('cancelRequest.confirm')}
        cancelLabel={t('cancelRequest.keep')}
        onCancel={() => {
          setCancelling(null);
        }}
        onConfirm={confirmCancel}
      />
      {/* The live region is on the page before its words, so they are announced. */}
      <p role="status" className={styles.status}>
        {cancel.isSuccess ? t('cancelRequest.done') : ''}
      </p>
      {cancel.isError && <ErrorNotice error={cancel.error} />}
      {refresh.isError && <ErrorNotice error={refresh.error} />}
    </section>
  );
}
