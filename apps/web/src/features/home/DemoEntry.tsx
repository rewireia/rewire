import { useEffect, useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/instance.ts';
import { Button } from '../../components/Button.tsx';
import { ErrorNotice } from '../../components/ErrorNotice.tsx';
import { Mark } from '../../components/Mark.tsx';
import { useMessages } from '../../i18n/use-messages.ts';
import { acceptSession } from '../dashboard/session-cache.ts';
import styles from './DemoEntry.module.css';

interface DemoEntryProps {
  readonly role: 'learner' | 'business';
  readonly onComplete: () => void;
}

const USERNAME = 'Rewire';
const PASSWORD = 'DemoDemoDemo';
const CHARACTERS = USERNAME.length + PASSWORD.length;
const TYPE_INTERVAL = 135;
const SIGN_IN_DELAY = 2500;
// Hold the confirmation for 1.2 s, then allow the 0.9 s card fade to finish.
const SUCCESS_DELAY = 2100;

function useDemoEntry({ role, onComplete }: DemoEntryProps) {
  const client = useQueryClient();
  const [characters, setCharacters] = useState(() =>
    window.matchMedia('(prefers-reduced-motion: reduce)').matches ? CHARACTERS : 0,
  );
  const [confirmed, setConfirmed] = useState(false);
  const alive = useRef(false);
  const successTimer = useRef<number | undefined>(undefined);
  const login = useMutation({
    mutationFn: async () => {
      await api.signIn(USERNAME, PASSWORD, role);
      const session = await api.session();
      if (!session.authenticated || session.accessRole !== role) {
        throw new Error('Demo access was not confirmed by the server.');
      }
      return session;
    },
    onSuccess: async (session) => {
      await acceptSession(client, session, role);
      if (!alive.current) return;
      setConfirmed(true);
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (reduced) onComplete();
      else successTimer.current = window.setTimeout(onComplete, SUCCESS_DELAY);
    },
  });
  const signIn = login.mutate;
  useEffect(() => {
    alive.current = true;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const timers = reduced
      ? []
      : Array.from({ length: CHARACTERS }, (_, index) =>
          window.setTimeout(
            () => {
              setCharacters(index + 1);
            },
            (index + 1) * TYPE_INTERVAL,
          ),
        );
    timers.push(
      window.setTimeout(
        () => {
          signIn();
        },
        reduced ? 0 : SIGN_IN_DELAY,
      ),
    );
    return () => {
      alive.current = false;
      timers.forEach((timer) => {
        window.clearTimeout(timer);
      });
      window.clearTimeout(successTimer.current);
    };
  }, [signIn, role]);
  return { characters, confirmed, login };
}

/** A real server-checked demo sign-in, with one visual introduction. */
export function DemoEntry(props: DemoEntryProps) {
  const { t } = useMessages();
  const { characters, confirmed, login } = useDemoEntry(props);
  return (
    <section
      className={styles.card}
      data-confirmed={confirmed}
      aria-labelledby="demo-entry-title"
      aria-busy={!confirmed && !login.isError}
    >
      <Mark size={36} />
      <div className={styles.heading}>
        <h2 id="demo-entry-title">{t('home.entry.title')}</h2>
        <p>{t(props.role === 'learner' ? 'home.entry.learner' : 'home.entry.business')}</p>
      </div>
      <DemoFields characters={characters} />
      <div className={styles.status} role="status" aria-live="polite">
        {confirmed && (
          <span className={styles.check} aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="m5 12 5 5 9-10" />
            </svg>
          </span>
        )}
        <span>
          {t(
            confirmed
              ? 'home.entry.success'
              : login.isError
                ? 'home.entry.failed'
                : login.isPending
                  ? 'access.pending'
                  : 'home.entry.preparing',
          )}
        </span>
      </div>
      <small>{t('home.entry.note')}</small>
      {login.isError && (
        <>
          <ErrorNotice error={login.error} />
          <div>
            <Button
              onClick={() => {
                login.mutate();
              }}
              disabled={login.isPending}
            >
              {t('home.entry.retry')}
            </Button>
          </div>
        </>
      )}
    </section>
  );
}

function DemoFields({ characters }: { readonly characters: number }) {
  const { t } = useMessages();
  return (
    <div className={styles.fields}>
      <label>
        {t('access.username')}
        <input
          readOnly
          tabIndex={-1}
          autoComplete="off"
          value={USERNAME.slice(0, Math.min(characters, USERNAME.length))}
        />
      </label>
      <label>
        {t('access.password')}
        <input
          readOnly
          tabIndex={-1}
          type="password"
          autoComplete="off"
          value={PASSWORD.slice(0, Math.max(characters - USERNAME.length, 0))}
        />
      </label>
    </div>
  );
}
