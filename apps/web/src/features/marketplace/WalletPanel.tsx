import type { Region } from '@rewire/contracts';

import { useWallet } from '../../api/marketplace-queries.ts';
import { useSession } from '../../api/queries.ts';
import { QueryState } from '../../components/QueryState.tsx';
import { useMediaQuery } from '../../components/use-media-query.ts';
import { formatMoney } from '../../i18n/format.ts';
import { useMessages } from '../../i18n/use-messages.ts';

import { useRisingAmount } from './wallet-motion.ts';
import { WalletFigures } from './WalletFigures.tsx';
import { WalletMovements } from './WalletMovements.tsx';
import styles from './Wallet.module.css';
import { WalletTopUp } from './WalletTopUp.tsx';

/** The learner's wallet: the balance, adding money with PayPal, and every movement. */
export function WalletPanel({ region }: { readonly region: Region }) {
  const { t } = useMessages();
  const session = useSession();
  const allowed = session.data?.authenticated === true && session.data.accessRole === 'learner';
  const wallet = useWallet(region, allowed);
  if (!allowed) return null;
  return (
    <section className={styles.wallet} aria-labelledby="wallet-title">
      <QueryState query={wallet}>
        {(data) => (
          <>
            <header className={styles.hero}>
              <span className={styles.eyebrow}>{t('wallet.eyebrow')}</span>
              <h2 id="wallet-title">{t('wallet.title')}</h2>
              <Balance minorUnits={data.availableMinor} currency={data.currency} />
              <p className={styles.quiet}>{t('wallet.body')}</p>
              <WalletFigures wallet={data} />
            </header>
            <WalletTopUp region={region} currency={data.currency} />
          </>
        )}
      </QueryState>
      <WalletMovements region={region} />
    </section>
  );
}

function Balance({
  minorUnits,
  currency,
}: {
  readonly minorUnits: number;
  readonly currency: Parameters<typeof formatMoney>[0]['currency'];
}) {
  const { t, language } = useMessages();
  const still = useMediaQuery('(prefers-reduced-motion: reduce)');
  const shown = useRisingAmount(minorUnits, still);
  return (
    <div className={styles.balance}>
      <span>{t('wallet.available')}</span>
      <strong aria-hidden="true">{formatMoney({ currency, minorUnits: shown }, language)}</strong>
      <span className="visually-hidden" aria-live="polite">
        {formatMoney({ currency, minorUnits }, language)}
      </span>
    </div>
  );
}
