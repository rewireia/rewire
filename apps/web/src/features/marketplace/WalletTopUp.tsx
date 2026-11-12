import {
  TOP_UP_MAXIMUM_MINOR,
  TOP_UP_MINIMUM_MINOR,
  type Currency,
  type Region,
  type StartedTopUp,
  type TopUpResult,
} from '@rewire/contracts';
import { useId, useState } from 'react';

import { usePaymentConfig } from '../../api/commerce-queries.ts';
import { api } from '../../api/instance.ts';
import { Capsule } from '../../components/Capsule.tsx';
import { QueryState } from '../../components/QueryState.tsx';
import { formatMoney } from '../../i18n/format.ts';
import { useMessages } from '../../i18n/use-messages.ts';
import { PayPalPayment } from '../checkout/PayPalCheckout.tsx';

import { TOP_UP_CHOICES, topUpAmountOf } from './top-up-amount.ts';
import styles from './Wallet.module.css';

const captureTopUp = (started: StartedTopUp) => api.captureTopUp(started.topUpId);
const topUpIdOf = (started: StartedTopUp) => started.topUpId;

/** An amount the person types, with the limits the wallet takes. */
function OtherAmount({
  currency,
  typed,
  valid,
  onChange,
}: {
  readonly currency: Currency;
  readonly typed: string;
  readonly valid: boolean;
  readonly onChange: (typed: string) => void;
}) {
  const { t, language } = useMessages();
  const field = useId();
  const money = (minorUnits: number) => formatMoney({ currency, minorUnits }, language);
  return (
    <div className={styles.other}>
      <label htmlFor={field}>{t('wallet.otherAmount', { currency })}</label>
      <input
        id={field}
        inputMode="decimal"
        autoComplete="off"
        value={typed}
        aria-describedby={`${field}-limits`}
        aria-invalid={typed !== '' && !valid}
        onChange={(event) => {
          onChange(event.target.value);
        }}
      />
      <p id={`${field}-limits`} className={styles.quiet}>
        {t('wallet.limits', {
          minimum: money(TOP_UP_MINIMUM_MINOR),
          maximum: money(TOP_UP_MAXIMUM_MINOR),
        })}
      </p>
    </div>
  );
}

/** PayPal's buttons for this amount: the server opens the top-up and captures it. */
function TopUpButtons({
  region,
  amountMinor,
  onCompleted,
}: {
  readonly region: Region;
  readonly amountMinor: number;
  readonly onCompleted: (result: TopUpResult) => void;
}) {
  const { t } = useMessages();
  const config = usePaymentConfig(region);
  return (
    <QueryState query={config}>
      {(payment) =>
        payment.available ? (
          <PayPalPayment
            key={amountMinor}
            config={payment}
            purpose="top-up"
            createOrder={() => api.openTopUp(region, amountMinor)}
            capture={captureTopUp}
            referenceOf={topUpIdOf}
            onCompleted={onCompleted}
          />
        ) : (
          <p className={styles.quiet}>{t('course.noPayments')}</p>
        )
      }
    </QueryState>
  );
}

/** Adding money with PayPal: an amount in a capsule, or typed, then PayPal's own buttons. */
export function WalletTopUp({
  region,
  currency,
}: {
  readonly region: Region;
  readonly currency: Currency;
}) {
  const { t, language } = useMessages();
  const [choice, setChoice] = useState<string>(String(TOP_UP_CHOICES[1]));
  const [typed, setTyped] = useState('');
  const [added, setAdded] = useState<TopUpResult | null>(null);
  const money = (minorUnits: number) => formatMoney({ currency, minorUnits }, language);
  const amountMinor = choice === 'other' ? topUpAmountOf(typed) : Number(choice);
  return (
    <section className={styles.topUp} aria-labelledby="wallet-add">
      <div className={styles.topUpHead}>
        <h3 id="wallet-add">{t('wallet.add')}</h3>
        <p className={styles.quiet}>{t('wallet.addBody')}</p>
      </div>
      <Capsule<string>
        legend={t('wallet.amount')}
        hideLegend
        fill
        options={[
          ...TOP_UP_CHOICES.map((minor) => ({ value: String(minor), label: money(minor) })),
          { value: 'other', label: t('wallet.other') },
        ]}
        value={choice}
        onChange={(next) => {
          setChoice(next);
          setAdded(null);
        }}
      />
      {choice === 'other' && (
        <OtherAmount
          currency={currency}
          typed={typed}
          valid={amountMinor !== null}
          onChange={(next) => {
            setTyped(next);
            setAdded(null);
          }}
        />
      )}
      <p className={styles.sandbox}>{t('wallet.sandbox')}</p>
      {amountMinor !== null && (
        <TopUpButtons region={region} amountMinor={amountMinor} onCompleted={setAdded} />
      )}
      {added !== null && (
        <p className={styles.added} role="status">
          {t('wallet.added', { amount: formatMoney(added.amount, language) })}
        </p>
      )}
    </section>
  );
}
