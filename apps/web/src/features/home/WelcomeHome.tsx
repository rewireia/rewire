import { useEffect, useRef } from 'react';

import { ButtonLink } from '../../components/Button.tsx';
import { useMessages } from '../../i18n/use-messages.ts';

import styles from './WelcomeHome.module.css';

/** The learner stays on the photograph until they explicitly start their journey. */
export function WelcomeHome({ role }: { readonly role: 'learner' | 'business' }) {
  const { t } = useMessages();
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    heading.current?.focus({ preventScroll: true });
  }, []);
  return (
    <section className={styles.welcome} aria-labelledby="welcome-title">
      <p className={styles.eyebrow}>{t('home.welcome.eyebrow')}</p>
      <h2 id="welcome-title" ref={heading} tabIndex={-1}>
        {t(role === 'learner' ? 'home.welcome.title' : 'home.welcome.businessTitle')}
      </h2>
      <p className={styles.body}>
        {t(role === 'learner' ? 'home.welcome.body' : 'home.welcome.businessBody')}
      </p>
      <ButtonLink to={role === 'learner' ? '/start' : '/business'} primary>
        {t(role === 'learner' ? 'home.welcome.start' : 'home.welcome.dashboard')}
      </ButtonLink>
    </section>
  );
}
