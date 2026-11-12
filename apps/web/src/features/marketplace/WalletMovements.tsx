import type { Region, WalletMovement } from '@rewire/contracts';

import { useWalletMovements } from '../../api/wallet-queries.ts';
import { QueryState } from '../../components/QueryState.tsx';
import { cx } from '../../components/cx.ts';
import { formatDay, formatMoney } from '../../i18n/format.ts';
import { useMessages } from '../../i18n/use-messages.ts';

import styles from './Wallet.module.css';

/** Every movement of the wallet, newest first, as the server records it. */
export function WalletMovements({ region }: { readonly region: Region }) {
  const { t } = useMessages();
  const movements = useWalletMovements(region);
  return (
    <section className={styles.movements} aria-labelledby="wallet-movements">
      <h3 id="wallet-movements">{t('wallet.movements')}</h3>
      <QueryState query={movements}>
        {(data) =>
          data.movements.length === 0 ? (
            <p className={styles.quiet}>{t('wallet.noMovements')}</p>
          ) : (
            <ol className={styles.list}>
              {data.movements.map((movement) => (
                <MovementRow key={movement.id} movement={movement} />
              ))}
            </ol>
          )
        }
      </QueryState>
    </section>
  );
}

function MovementRow({ movement }: { readonly movement: WalletMovement }) {
  const { t, language } = useMessages();
  const counts = movement.status === 'completed';
  const amount = formatMoney(
    { currency: movement.currency, minorUnits: Math.abs(movement.amountMinor) },
    language,
  );
  return (
    <li className={styles.row}>
      <div className={styles.what}>
        <strong>{t(`wallet.kind.${movement.kind}`)}</strong>
        <span>
          {formatDay(movement.occurredAt, language)}
          {movement.title !== null && ` · ${movement.title}`}
        </span>
        {movement.paypalReference !== null && (
          <span className={styles.reference}>
            {t('wallet.reference')} <span className="mono">{movement.paypalReference}</span>
          </span>
        )}
      </div>
      <div className={styles.amountCell}>
        <span
          className={cx(
            styles.amount,
            counts && movement.amountMinor > 0 && styles.credit,
            !counts && styles.void,
          )}
        >
          {movement.amountMinor > 0 ? '+' : '−'}
          {amount}
        </span>
        <span className={cx(styles.status, styles[`status-${movement.status}`])}>
          {t(`wallet.status.${movement.status}`)}
        </span>
      </div>
    </li>
  );
}
