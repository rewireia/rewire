import type { Region, Wallet, WalletMovement } from '@rewire/contracts';

import { useWallet } from '../../api/marketplace-queries.ts';
import { useWalletMovements } from '../../api/wallet-queries.ts';
import { DEMO_SELLER } from '../../app/seller.ts';
import { ButtonLink } from '../../components/Button.tsx';
import { QueryState } from '../../components/QueryState.tsx';
import { formatDay, formatMoney, interpolate } from '../../i18n/format.ts';
import { useMessages } from '../../i18n/use-messages.ts';
import { dashboardCopy } from './dashboard-copy.ts';
import { walletSplit } from './recent-activity.ts';
import styles from './Overview.module.css';

/** How many movements the card lists; the wallet tab has them all. */
const MOVEMENTS_SHOWN = 3;

/** The wallet at a glance: what is left, what was added and spent, and its latest movements. */
export function WalletCard({ region }: { readonly region: Region }) {
  const { language } = useMessages();
  const copy = dashboardCopy[language];
  const wallet = useWallet(region);
  return (
    <section className={styles.wallet} aria-labelledby="dashboard-wallet">
      <header className={styles.cardHead}>
        <p className={styles.eyebrow}>{copy.walletEyebrow}</p>
        <h2 id="dashboard-wallet">{copy.walletTitle}</h2>
      </header>
      <QueryState query={wallet}>{(data) => <WalletFigures wallet={data} />}</QueryState>
      <Movements region={region} />
      <div className={styles.walletFoot}>
        <ButtonLink primary to="?tab=wallet">
          {copy.addFundsPaypal}
        </ButtonLink>
        <p className={styles.sandbox}>{copy.sandbox}</p>
      </div>
    </section>
  );
}

function WalletFigures({ wallet }: { readonly wallet: Wallet }) {
  const { language } = useMessages();
  const copy = dashboardCopy[language];
  const money = (minorUnits: number) =>
    formatMoney({ currency: wallet.currency, minorUnits }, language);
  const split = walletSplit(wallet);
  return (
    <>
      <p className={styles.balance}>
        <span>{copy.available}</span>
        <strong>{money(wallet.availableMinor)}</strong>
      </p>
      {split !== null && (
        <span className={styles.split} aria-hidden="true">
          <span data-part="spent" style={{ flexGrow: split.spent }} />
          <span data-part="available" style={{ flexGrow: split.available }} />
        </span>
      )}
      <dl className={styles.walletNumbers}>
        <div data-part="funded">
          <dt>{copy.funded}</dt>
          <dd>{money(wallet.fundedMinor)}</dd>
        </div>
        <div data-part="spent">
          <dt>{copy.spent}</dt>
          <dd>{money(wallet.spentMinor)}</dd>
        </div>
      </dl>
    </>
  );
}

function Movements({ region }: { readonly region: Region }) {
  const { language } = useMessages();
  const copy = dashboardCopy[language];
  const movements = useWalletMovements(region);
  return (
    <div className={styles.movements}>
      <h3>{copy.movements}</h3>
      <QueryState query={movements}>
        {({ movements: rows }) =>
          rows.length === 0 ? (
            <p className={styles.quiet}>{copy.noMovements}</p>
          ) : (
            <ul className={styles.lines}>
              {rows.slice(0, MOVEMENTS_SHOWN).map((movement) => (
                <MovementLine key={movement.id} movement={movement} />
              ))}
            </ul>
          )
        }
      </QueryState>
    </div>
  );
}

function MovementLine({ movement }: { readonly movement: WalletMovement }) {
  const { language } = useMessages();
  const copy = dashboardCopy[language];
  const label =
    movement.kind === 'top-up'
      ? copy.topUp
      : movement.kind === 'refund'
        ? copy.refundBack
        : interpolate(copy.paidTo, { seller: DEMO_SELLER }, language);
  return (
    <li className={styles.line} data-sign={movement.amountMinor < 0 ? 'out' : 'in'}>
      <span className={styles.lineText}>
        <span>{label}</span>
        <span className={styles.lineMeta}>
          {movement.title ?? formatDay(movement.occurredAt, language)}
        </span>
      </span>
      <strong>
        {movement.amountMinor > 0 ? '+' : '−'}
        {formatMoney(
          { currency: movement.currency, minorUnits: Math.abs(movement.amountMinor) },
          language,
        )}
      </strong>
    </li>
  );
}
