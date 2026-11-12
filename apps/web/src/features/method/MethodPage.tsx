import pageStyles from '../../app/Page.module.css';
import { useMessages } from '../../i18n/use-messages.ts';

import styles from './MethodPage.module.css';
import { JourneyOverview } from './JourneyOverview.tsx';
import { RegionFacts } from '../home/RegionFacts.tsx';

const STEPS = [1, 2, 3, 4, 5] as const;
const LIMITS = [
  'report.limits.potential',
  'report.limits.person',
  'report.limits.range',
  'method.limits.translation',
] as const;

const PAYMENTS = [
  'method.payments.server',
  'method.payments.paypal',
  'method.payments.refund',
  'method.payments.employer',
  'method.payments.demo',
] as const;

/**
 * `/what-is-rewire`: what Rewire is, for whom and the whole journey; then the method, its limits,
 * what is real and what is sandbox. Credits and privacy have their own pages.
 */
export function MethodPage() {
  const { t } = useMessages();
  return (
    <div className={pageStyles.page}>
      <header className={pageStyles.intro}>
        <span className={pageStyles.eyebrow}>{t('about.eyebrow')}</span>
        <h1 className={styles.slogan}>{t('about.slogan')}</h1>
        <p className={pageStyles.lede}>{t('about.lede')}</p>
      </header>
      <JourneyOverview />
      <details className={styles.method}>
        <summary>{t('method.steps.title')}</summary>
        <RegionFacts />
        <ol className={styles.steps}>
          {STEPS.map((step) => (
            <li key={step} className={styles.step}>
              <h3>{t(`method.step.${step}.title`)}</h3>
              <p>{t(`method.step.${step}.body`)}</p>
            </li>
          ))}
        </ol>
      </details>
      <section className={pageStyles.section} aria-labelledby="method-limits">
        <h2 id="method-limits">{t('method.limits.title')}</h2>
        <ul className={styles.limits}>
          {LIMITS.map((key) => (
            <li key={key}>{t(key)}</li>
          ))}
        </ul>
      </section>
      <section id="payments" className={pageStyles.section} aria-labelledby="method-payments">
        <h2 id="method-payments">{t('method.payments.title')}</h2>
        <ul className={styles.limits}>
          {PAYMENTS.map((key) => (
            <li key={key}>{t(key)}</li>
          ))}
        </ul>
      </section>
    </div>
  );
}
