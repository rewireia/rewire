import { Link } from 'react-router';

import { problemMessage, solvedOnDashboard } from '../i18n/problems.ts';
import { useMessages } from '../i18n/use-messages.ts';

import { Button } from './Button.tsx';
import styles from './ErrorNotice.module.css';

/** What happened and what to do: the problem in the person's language, and a way to try again. */
export function ErrorNotice({
  error,
  onRetry,
}: {
  readonly error: unknown;
  readonly onRetry?: () => void;
}) {
  const { t } = useMessages();
  return (
    <div className={styles.notice} role="alert">
      <p className={styles.title}>{t('error.title')}</p>
      <p className={styles.detail}>{problemMessage(error, t)}</p>
      {solvedOnDashboard(error) && <Link to="/dashboard">{t('problem.toDashboard')}</Link>}
      {onRetry !== undefined && <Button onClick={onRetry}>{t('error.retry')}</Button>}
    </div>
  );
}
