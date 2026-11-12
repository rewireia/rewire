import type { PayPalOneTimePaymentSessionOptions } from '@paypal/paypal-js/sdk-v6';
import type { CaptureResult, StartedOrder } from '@rewire/contracts';
import { useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';

import { refreshLearnerData } from '../../api/commerce-queries.ts';
import { api } from '../../api/instance.ts';
import { ErrorNotice } from '../../components/ErrorNotice.tsx';
import { LoadingBar } from '../../components/LoadingBar.tsx';
import { useMessages } from '../../i18n/use-messages.ts';

import { captureOutcome, type CaptureOutcome, type Settled } from './capture-outcome.ts';
import { SandboxBuyer } from './SandboxBuyer.tsx';
import styles from './Checkout.module.css';
import {
  usePayPalSdk,
  type AvailablePayments,
  type PayPalInstance,
  type SdkState,
} from './paypal-sdk.ts';

type Step =
  | { readonly kind: 'idle' }
  | { readonly kind: 'capturing' }
  | { readonly kind: 'closed'; readonly how: 'cancelled' | 'error' }
  | { readonly kind: 'settled'; readonly outcome: CaptureOutcome; readonly orderId: string }
  | { readonly kind: 'problem'; readonly error: unknown };

/** What the server opened at PayPal for the person to approve. */
interface Opened {
  readonly paypalOrderId: string;
}

interface PayPalCheckoutProps {
  readonly config: AvailablePayments;
  /** Opens the order at the server, or hands over one already opened. Never an amount. */
  readonly createOrder: () => Promise<StartedOrder>;
  readonly onCompleted: (result: CaptureResult) => void;
  readonly onCancelled?: () => Promise<void>;
}

/** What is paid for, and so how its outcome is told: a course, or money added to the wallet. */
type Purpose = 'course' | 'top-up';

interface PayPalPaymentProps<Started extends Opened, Result extends Settled> {
  readonly config: AvailablePayments;
  /** Opens the payment at the server. Never an amount from the browser. */
  readonly createOrder: () => Promise<Started>;
  /** Captures at the server what the person approved at PayPal. */
  readonly capture: (started: Started) => Promise<Result>;
  /** The server's id of what was opened, quoted when a payment needs looking into. */
  readonly referenceOf: (started: Started) => string;
  readonly purpose: Purpose;
  readonly onCompleted: (result: Result) => void;
  readonly onCancelled?: () => Promise<void>;
}

const captureCourseOrder = (started: StartedOrder) => api.captureOrder(started.orderId);
const orderIdOf = (started: StartedOrder) => started.orderId;

/** PayPal's own buttons, with the SDK v6; our server opens and captures the order of a course. */
export function PayPalCheckout(props: PayPalCheckoutProps) {
  return (
    <PayPalPayment
      {...props}
      capture={captureCourseOrder}
      referenceOf={orderIdOf}
      purpose="course"
    />
  );
}

/** PayPal's own buttons for any payment the server opens and captures, such as a top-up. */
export function PayPalPayment<Started extends Opened, Result extends Settled>({
  config,
  createOrder,
  capture,
  referenceOf,
  purpose,
  onCompleted,
  onCancelled,
}: PayPalPaymentProps<Started, Result>) {
  const { t } = useMessages();
  const sdk = usePayPalSdk(config);
  const [prepared, setPrepared] = useState(
    config.environment !== 'sandbox' || !config.sandboxBuyer,
  );
  const [step, setStep] = useState<Step>({ kind: 'idle' });
  const pay = usePayment({ createOrder, capture, referenceOf, onCompleted, onCancelled }, setStep);
  return (
    <div className={styles.checkout}>
      <SandboxBuyer
        config={config}
        onPrepared={() => {
          setPrepared(true);
        }}
      />
      {sdk.status === 'loading' && <LoadingBar label={t('checkout.loading')} />}
      {sdk.status === 'failed' && <p className={styles.notice}>{t('checkout.failedToLoad')}</p>}
      {sdk.status === 'ready' && (
        <>
          <Buttons sdk={sdk} prepared={prepared} pay={pay} />
          <StepMessage step={step} purpose={purpose} />
        </>
      )}
    </div>
  );
}

/** PayPal's button, and Pay Later's when PayPal offers it, once the buyer is prepared. */
function Buttons({
  sdk,
  prepared,
  pay,
}: {
  readonly sdk: Extract<SdkState, { readonly status: 'ready' }>;
  readonly prepared: boolean;
  readonly pay: (instance: PayPalInstance, kind: 'paypal' | 'paylater') => void;
}) {
  const { t } = useMessages();
  const { instance, payLater } = sdk;
  if (!sdk.paypal) return <p className={styles.notice}>{t('checkout.notEligible')}</p>;
  return (
    <div className={styles.buttons} inert={!prepared} style={{ opacity: prepared ? 1 : 0.45 }}>
      <paypal-button
        type="pay"
        onClick={() => {
          pay(instance, 'paypal');
        }}
      />
      {payLater !== null && (
        <paypal-pay-later-button
          countryCode={payLater.countryCode}
          productCode={payLater.productCode}
          onClick={() => {
            pay(instance, 'paylater');
          }}
        />
      )}
    </div>
  );
}

/** Starts PayPal's window with the order the server opens, and captures it on approval. */
function usePayment<Started extends Opened, Result extends Settled>(
  {
    createOrder,
    capture: captureAtServer,
    referenceOf,
    onCompleted,
    onCancelled,
  }: Omit<PayPalPaymentProps<Started, Result>, 'config' | 'purpose' | 'onCancelled'> & {
    readonly onCancelled: (() => Promise<void>) | undefined;
  },
  setStep: (step: Step | ((previous: Step) => Step)) => void,
) {
  const client = useQueryClient();
  const order = useRef<Started | null>(null);
  const closed = (how: 'cancelled' | 'error') => {
    setStep((previous) => (previous.kind === 'problem' ? previous : { kind: 'closed', how }));
  };
  const capture = async (paypalOrderId: string) => {
    const started = order.current;
    if (started?.paypalOrderId !== paypalOrderId) {
      closed('error');
      return;
    }
    setStep({ kind: 'capturing' });
    try {
      const result = await captureAtServer(started);
      await refreshLearnerData(client);
      settle(result, referenceOf(started), setStep, onCompleted);
    } catch (error) {
      setStep({ kind: 'problem', error });
    }
  };
  return (instance: PayPalInstance, kind: 'paypal' | 'paylater') => {
    setStep({ kind: 'idle' });
    const options: PayPalOneTimePaymentSessionOptions = {
      onApprove: ({ orderId }) => capture(orderId),
      onCancel: () => {
        cancelPayment(
          onCancelled,
          () => {
            order.current = null;
            closed('cancelled');
          },
          setStep,
        );
      },
      onError: () => {
        closed('error');
      },
    };
    const session =
      kind === 'paypal'
        ? instance.createPayPalOneTimePaymentSession(options)
        : instance.createPayLaterOneTimePaymentSession(options);
    // PayPal's window waits on this promise, which resolves to PayPal's id of our order.
    const opened = openPaymentOrder(createOrder, order, setStep);
    session.start({ presentationMode: 'auto' }, opened).catch(() => {
      closed('error');
    });
  };
}

/** Tells the person how the payment stands, and hands a completed one on. */
function settle<Result extends Settled>(
  result: Result,
  reference: string,
  setStep: (step: Step) => void,
  onCompleted: (result: Result) => void,
) {
  const outcome = captureOutcome(result);
  setStep({ kind: 'settled', outcome, orderId: reference });
  if (outcome === 'completed') {
    onCompleted(result);
  }
}

function openPaymentOrder<Started extends Opened>(
  createOrder: () => Promise<Started>,
  order: { current: Started | null },
  setStep: (step: Step) => void,
) {
  return createOrder().then(
    (started) => {
      order.current = started;
      return { orderId: started.paypalOrderId };
    },
    (error: unknown) => {
      setStep({ kind: 'problem', error });
      throw error instanceof Error ? error : new Error('The order could not be opened');
    },
  );
}

function cancelPayment(
  onCancelled: (() => Promise<void>) | undefined,
  finish: () => void,
  setStep: (step: Step) => void,
) {
  if (!onCancelled) {
    finish();
    return;
  }
  void onCancelled().then(finish, (error: unknown) => {
    setStep({ kind: 'problem', error });
  });
}

function StepMessage({ step, purpose }: { readonly step: Step; readonly purpose: Purpose }) {
  const { t } = useMessages();
  switch (step.kind) {
    case 'idle':
      return <p className={styles.small}>{t('checkout.nothingCharged')}</p>;
    case 'capturing':
      return <LoadingBar label={t('checkout.capturing')} />;
    case 'closed':
      return <p className={styles.notice}>{t(`checkout.${step.how}`)}</p>;
    case 'problem':
      return <ErrorNotice error={step.error} />;
    case 'settled':
      return (
        <div className={styles.notice} role="status">
          <p>
            {t(
              purpose === 'course'
                ? `checkout.outcome.${step.outcome}`
                : `wallet.outcome.${step.outcome}`,
            )}
          </p>
          {(step.outcome === 'mismatch' || step.outcome === 'review') && (
            <p>
              {t('checkout.orderNumber')} <span className="mono">{step.orderId}</span>
            </p>
          )}
        </div>
      );
  }
}
