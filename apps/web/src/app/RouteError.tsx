import buttonStyles from '../components/Button.module.css';
import { cx } from '../components/cx.ts';
import { Mark } from '../components/Mark.tsx';
import { translate } from '../i18n/format.ts';

import { BRAND_NAME } from './brand.ts';
import pageStyles from './Page.module.css';
import { usePreferences, type Language } from './preferences.ts';
import styles from './RouteError.module.css';

interface ErrorViewProps {
  readonly language: Language;
  /** True when the frame itself failed: the page then brings its own name bar. */
  readonly standalone: boolean;
}

/**
 * What a person sees when a page fails to show: what happened and what to do, in their language,
 * with no technical detail. Plain links and a full reload, so it needs nothing that just failed.
 */
export function ErrorView({ language, standalone }: ErrorViewProps) {
  const t = (key: Parameters<typeof translate>[1]) => translate(language, key);
  return (
    <div className={cx(standalone && styles.standalone)}>
      {standalone && (
        <p className={styles.bar}>
          <Mark size={20} />
          <span>{BRAND_NAME}</span>
        </p>
      )}
      <div className={pageStyles.page}>
        <section className={styles.card} role="alert" aria-labelledby="route-error-title">
          <h1 id="route-error-title">{t('routeError.title')}</h1>
          <p className={pageStyles.lede}>{t('routeError.body')}</p>
          <div className={styles.actions}>
            <button
              type="button"
              className={cx(buttonStyles.button, buttonStyles.primary)}
              onClick={() => {
                window.location.reload();
              }}
            >
              {t('routeError.reload')}
            </button>
            <a href="/start" className={buttonStyles.button}>
              {t('notFound.home')}
            </a>
          </div>
        </section>
      </div>
    </div>
  );
}

/** The router's error page, inside the frame or, if the frame failed, on its own. */
export function RouteError({ standalone = false }: { readonly standalone?: boolean }) {
  const { language } = usePreferences();
  return <ErrorView language={language} standalone={standalone} />;
}
