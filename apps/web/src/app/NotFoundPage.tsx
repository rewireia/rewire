import { ButtonLink } from '../components/Button.tsx';
import { useMessages } from '../i18n/use-messages.ts';

import styles from './Page.module.css';

export function NotFoundPage() {
  const { t } = useMessages();
  return (
    <div className={styles.page}>
      <header className={styles.intro}>
        <h1>{t('notFound.title')}</h1>
        <p className={styles.lede}>{t('notFound.body')}</p>
        <ButtonLink to="/start">{t('notFound.home')}</ButtonLink>
      </header>
    </div>
  );
}
