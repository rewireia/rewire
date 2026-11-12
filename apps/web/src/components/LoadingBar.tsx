import { useMessages } from '../i18n/use-messages.ts';

import styles from './LoadingBar.module.css';

/**
 * The one-shot thinking bar: it fills once over about four seconds and stays full until the
 * answer arrives, when its owner removes it. It never loops.
 */
export function LoadingBar({ label }: { readonly label?: string }) {
  const { t } = useMessages();
  const text = label ?? t('loading.label');
  return (
    <div role="status" aria-live="polite">
      <div className={styles.track} role="progressbar" aria-label={text}>
        <div className={styles.fill} />
      </div>
      <p className={styles.label}>{text}</p>
    </div>
  );
}
