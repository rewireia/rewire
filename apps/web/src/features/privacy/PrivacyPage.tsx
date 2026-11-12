import { useGuideDisclosure } from '../../api/guide-queries.ts';
import pageStyles from '../../app/Page.module.css';
import { useMessages } from '../../i18n/use-messages.ts';
import { privacyKeys } from '../guide/privacy.ts';

import styles from './Privacy.module.css';

/** Where words written to Rex or Tempo go, as the server's configuration says. */
function AssistantsPrivacy() {
  const { t } = useMessages();
  const disclosure = useGuideDisclosure();
  return (
    <section className={pageStyles.section} aria-labelledby="privacy-ai">
      <h2 id="privacy-ai">{t('privacy.ai.title')}</h2>
      <p className={styles.text}>
        {privacyKeys(disclosure)
          .map((key) => t(key))
          .join(' ')}
      </p>
    </section>
  );
}

/** `/privacy`: what Rewire keeps, what it does not, where AI messages go and payments. */
export function PrivacyPage() {
  const { t } = useMessages();
  return (
    <div className={pageStyles.page}>
      <header className={pageStyles.intro}>
        <span className={pageStyles.eyebrow}>{t('privacy.eyebrow')}</span>
        <h1>{t('privacy.title')}</h1>
        <p className={pageStyles.lede}>{t('method.privacy.body')}</p>
      </header>
      <section className={pageStyles.section} aria-labelledby="privacy-kept">
        <h2 id="privacy-kept">{t('method.privacy.keptTitle')}</h2>
        <p className={styles.text}>{t('method.privacy.kept')}</p>
      </section>
      <section className={pageStyles.section} aria-labelledby="privacy-not-kept">
        <h2 id="privacy-not-kept">{t('method.privacy.notKeptTitle')}</h2>
        <p className={styles.text}>{t('method.privacy.notKept')}</p>
      </section>
      <AssistantsPrivacy />
      <section className={pageStyles.section} aria-labelledby="privacy-payments">
        <h2 id="privacy-payments">{t('privacy.payments.title')}</h2>
        <p className={styles.text}>{t('privacy.payments.body')}</p>
      </section>
    </div>
  );
}
