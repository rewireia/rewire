import { useParams } from 'react-router';
import { regionSchema } from '@rewire/contracts';
import { usePreferences } from '../../app/preferences.ts';
import { useId, useRef, useState } from 'react';
import { Button } from '../../components/Button.tsx';
import { useMessages } from '../../i18n/use-messages.ts';
import type { AvailablePayments } from './paypal-sdk.ts';
import styles from './SandboxBuyer.module.css';

/** Sandbox access is explicitly configured by the server and never shown for live payments. */
export function SandboxBuyer({
  config,
  standalone = false,
  onPrepared,
}: {
  readonly config: AvailablePayments;
  readonly standalone?: boolean;
  readonly onPrepared?: () => void;
}) {
  const params = useParams();
  const preferences = usePreferences();
  const region = regionSchema.safeParse(params.region).data ?? preferences.region;
  const { t, language } = useMessages();
  const titleId = useId();
  if (config.environment !== 'sandbox') return null;
  if (!standalone)
    return (
      <aside className={styles.compact}>
        <span className={styles.eyebrow}>PAYPAL SANDBOX</span>
        <p>
          {language === 'es'
            ? 'Compra de prueba. No se mueve dinero real.'
            : 'Test purchase. No real money moves.'}
        </p>
        {config.sandboxBuyer && (
          <a
            href={`/${region}/sandbox-access`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={onPrepared}
          >
            {language === 'es' ? '1. Abrir credenciales de prueba' : '1. Open test credentials'} ↗
          </a>
        )}
        {onPrepared && (
          <p>
            {language === 'es'
              ? 'Deja esa pestaña abierta y vuelve aquí para pagar con PayPal.'
              : 'Keep that tab open, then return here to pay with PayPal.'}
          </p>
        )}
      </aside>
    );
  return (
    <aside className={styles.panel} aria-labelledby={titleId}>
      <span className={styles.eyebrow}>PAYPAL SANDBOX</span>
      <h3 id={titleId}>{t('sandbox.title')}</h3>
      <p>{t('sandbox.body')}</p>
      {config.sandboxBuyer ? (
        <>
          <p>{t('sandbox.steps')}</p>
          <CopyField label={t('sandbox.email')} value={config.sandboxBuyer.email} />
          <CopyField label={t('sandbox.password')} value={config.sandboxBuyer.password} />
        </>
      ) : (
        <p>{t('sandbox.missing')}</p>
      )}
    </aside>
  );
}
function CopyField({ label, value }: { readonly label: string; readonly value: string }) {
  const { t } = useMessages();
  const input = useRef<HTMLInputElement>(null);
  const id = useId();
  const [status, setStatus] = useState<'copied' | 'failed' | null>(null);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setStatus('copied');
    } catch {
      input.current?.focus();
      input.current?.select();
      setStatus('failed');
    }
  };
  return (
    <div className={styles.item}>
      <label htmlFor={id}>{label}</label>
      <span className={styles.control}>
        <input
          id={id}
          ref={input}
          type="text"
          autoComplete="off"
          spellCheck={false}
          readOnly
          value={value}
          onFocus={(event) => {
            event.currentTarget.select();
          }}
        />
        <Button
          aria-label={`${t('sandbox.copy')} ${label}`}
          onClick={() => {
            void copy();
          }}
        >
          {t('sandbox.copy')}
        </Button>
      </span>
      <span className={styles.status} role="status" aria-live="polite">
        {status === 'copied'
          ? t('sandbox.copied')
          : status === 'failed'
            ? t('sandbox.copyFailed')
            : ''}
      </span>
    </div>
  );
}
