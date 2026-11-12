import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useId, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';

import { OPEN_SIGN_IN } from '../../app/access.ts';
import { acceptSession } from './session-cache.ts';
import { api } from '../../api/instance.ts';
import { problemCode } from '../../api/request.ts';
import { Mark } from '../../components/Mark.tsx';
import { Button } from '../../components/Button.tsx';
import { ErrorNotice } from '../../components/ErrorNotice.tsx';
import { useMessages } from '../../i18n/use-messages.ts';

import styles from './SignIn.module.css';

type AccessRole = 'learner' | 'business';

function useDemoSignIn(role: AccessRole) {
  const client = useQueryClient();
  const navigate = useNavigate();
  const [search] = useSearchParams();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const login = useMutation({
    mutationFn: () => api.signIn(username, password, role),
    onSuccess: async () => {
      await acceptSession(client, await api.session(), role);
      const next = search.get('next');
      if (role === 'learner' && next !== null && /^\/(eu|us|uk)\/plan\/\d{4}$/.test(next)) {
        await navigate(next);
      }
    },
  });
  return { username, setUsername, password, setPassword, login };
}

function SignInForm({ role }: { readonly role: AccessRole }) {
  const { t } = useMessages();
  const { username, setUsername, password, setPassword, login } = useDemoSignIn(role);
  return (
    <form
      className={styles.form}
      onSubmit={(event) => {
        event.preventDefault();
        login.mutate();
      }}
    >
      <label>
        {t('access.username')}
        <input
          autoComplete="username"
          value={username}
          required
          maxLength={80}
          onChange={(event) => {
            setUsername(event.target.value);
          }}
        />
      </label>
      <label>
        {t('access.password')}
        <input
          type="password"
          autoComplete="current-password"
          value={password}
          required
          maxLength={80}
          onChange={(event) => {
            setPassword(event.target.value);
          }}
        />
      </label>
      {login.isError &&
        (problemCode(login.error) === 'invalid_credentials' ? (
          <p role="alert">{t('access.invalid')}</p>
        ) : (
          <ErrorNotice error={login.error} />
        ))}
      <Button primary type="submit" disabled={login.isPending}>
        {t(login.isPending ? 'access.pending' : 'access.signIn')}
      </Button>
    </form>
  );
}

/** A real modal, with visible demo credentials and a server-checked login. */
export function SignIn({ role = 'learner' }: { readonly role?: AccessRole }) {
  const { t } = useMessages();
  const titleId = useId();
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const open = () => {
      if (dialog.current && !dialog.current.open) {
        dialog.current.showModal();
      }
    };
    open();
    window.addEventListener(OPEN_SIGN_IN, open);
    return () => {
      window.removeEventListener(OPEN_SIGN_IN, open);
    };
  }, []);
  return (
    <section className={styles.gate}>
      <Mark size={48} />
      <h2>{t(role === 'business' ? 'access.businessTitle' : 'access.title')}</h2>
      <p>{t(role === 'business' ? 'access.businessBody' : 'access.body')}</p>
      <Button
        primary
        onClick={() => {
          dialog.current?.showModal();
        }}
      >
        {t('access.signIn')}
      </Button>
      <dialog ref={dialog} className={styles.dialog} aria-labelledby={titleId}>
        <div className={styles.content}>
          <button
            className={styles.close}
            type="button"
            aria-label={t('access.close')}
            onClick={() => {
              dialog.current?.close();
            }}
          >
            ×
          </button>
          <Mark size={40} />
          <h2 id={titleId}>{t('access.signIn')}</h2>
          <p>{t(role === 'business' ? 'access.businessBody' : 'access.body')}</p>
          <aside className={styles.demo}>
            <span>{t('access.demo')}</span>
            <p>
              {t('access.username')}: <strong>Rewire</strong> · {t('access.password')}:{' '}
              <strong>DemoDemoDemo</strong>
            </p>
          </aside>
          <SignInForm role={role} />
        </div>
      </dialog>
    </section>
  );
}

export function SignOut() {
  const { t } = useMessages();
  const client = useQueryClient();
  const logout = useMutation({
    mutationFn: () => api.signOut(),
    onSuccess: async () => {
      await client.cancelQueries();
      client.setQueryData(['session'], (session: unknown) =>
        typeof session === 'object' && session !== null
          ? { ...session, authenticated: false, accessRole: null }
          : undefined,
      );
      client.removeQueries({
        predicate: (query) =>
          [
            'payments',
            'enrolments',
            'sponsorships',
            'wallet',
            'market-catalogue',
            'market-sales',
            'training-courses',
            'study-plan',
            'content',
          ].includes(String(query.queryKey[0])),
      });
      await client.invalidateQueries({ queryKey: ['session'] });
    },
  });
  return (
    <div>
      <Button
        onClick={() => {
          logout.mutate();
        }}
        disabled={logout.isPending}
      >
        {t('access.signOut')}
      </Button>
      {logout.isError && <ErrorNotice error={logout.error} />}
    </div>
  );
}
