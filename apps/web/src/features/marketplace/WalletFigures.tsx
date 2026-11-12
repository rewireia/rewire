import type { Wallet } from '@rewire/contracts';

import { formatMoney } from '../../i18n/format.ts';
import { useMessages } from '../../i18n/use-messages.ts';

import styles from './Wallet.module.css';

/** Where the balance comes from: added with PayPal, and spent on courses. */
export function WalletFigures({ wallet }: { readonly wallet: Wallet }) {
  const { t, language } = useMessages();
  const money = (minorUnits: number) =>
    formatMoney({ minorUnits, currency: wallet.currency }, language);
  return (
    <dl className={styles.figures}>
      <div>
        <dt>{t('wallet.funded')}</dt>
        <dd>{money(wallet.fundedMinor)}</dd>
      </div>
      <div>
        <dt>{t('wallet.spent')}</dt>
        <dd>{money(wallet.spentMinor)}</dd>
      </div>
    </dl>
  );
}
