import type { CaptureResult, Money, Region } from '@rewire/contracts';
import { Link } from 'react-router';

import { useWallet } from '../../api/marketplace-queries.ts';
import { useSession } from '../../api/queries.ts';
import { problemCode } from '../../api/request.ts';
import { usePayFromWallet } from '../../api/wallet-queries.ts';
import { Button } from '../../components/Button.tsx';
import { ErrorNotice } from '../../components/ErrorNotice.tsx';
import { LoadingBar } from '../../components/LoadingBar.tsx';
import { formatMoney } from '../../i18n/format.ts';
import { useMessages } from '../../i18n/use-messages.ts';

import styles from './Wallet.module.css';

interface PayFromBalanceProps {
  readonly region: Region;
  readonly courseIds: readonly string[];
  /** What the courses cost, as the server priced them, to say before paying whether it fits. */
  readonly total?: Money;
  readonly label?: string;
  readonly onCompleted: (result: CaptureResult) => void;
}

/**
 * Pays for courses from the wallet in one step. The server sets the price and checks the
 * balance; a balance that does not cover it is said plainly, with the way to add funds.
 */
/** What the balance has, or that it does not cover the payment, with the way to add funds. */
function BalanceNote({
  available,
  total,
  short,
}: {
  readonly available: Money;
  readonly total: Money | undefined;
  readonly short: boolean;
}) {
  const { t, language } = useMessages();
  if (!short) {
    return (
      <p className={styles.quiet}>
        {t('wallet.available')}: {formatMoney(available, language)}
      </p>
    );
  }
  return (
    <p className={styles.short}>
      {total === undefined
        ? t('problem.insufficient_balance')
        : t('wallet.short', {
            available: formatMoney(available, language),
            amount: formatMoney(total, language),
          })}{' '}
      <Link to="/dashboard?tab=wallet">{t('wallet.topUpLink')}</Link>
    </p>
  );
}

export function PayFromBalance({
  region,
  courseIds,
  total,
  label,
  onCompleted,
}: PayFromBalanceProps) {
  const { t, language } = useMessages();
  const session = useSession();
  const learner = session.data?.authenticated === true && session.data.accessRole === 'learner';
  const wallet = useWallet(region, learner);
  const pay = usePayFromWallet();
  // The wallet is the signed-in learner's: a visitor pays with PayPal only.
  if (!learner) return null;
  const available = wallet.data && {
    currency: wallet.data.currency,
    minorUnits: wallet.data.availableMinor,
  };
  const short =
    (available !== undefined && total !== undefined && available.minorUnits < total.minorUnits) ||
    problemCode(pay.error) === 'insufficient_balance';
  const text =
    label ??
    (total === undefined
      ? t('wallet.payPlain')
      : t('wallet.pay', { amount: formatMoney(total, language) }));
  return (
    <div className={styles.payFromBalance}>
      <Button
        primary
        disabled={pay.isPending || pay.isSuccess || short || available === undefined}
        onClick={() => {
          pay.mutate(
            { region, courseIds: [...courseIds] },
            {
              onSuccess: (result) => {
                if (result.status === 'completed') onCompleted(result);
              },
            },
          );
        }}
      >
        {text}
      </Button>
      {available !== undefined && <BalanceNote available={available} total={total} short={short} />}
      {pay.isPending && <LoadingBar label={t('wallet.paying')} />}
      {pay.isSuccess && (
        <p className={styles.added} role="status">
          {t('wallet.paid')}
        </p>
      )}
      {pay.isError && problemCode(pay.error) !== 'insufficient_balance' && (
        <ErrorNotice error={pay.error} />
      )}
    </div>
  );
}
