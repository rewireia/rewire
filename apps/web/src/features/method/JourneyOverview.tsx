import { ButtonLink } from '../../components/Button.tsx';
import { useMessages } from '../../i18n/use-messages.ts';
import pageStyles from '../../app/Page.module.css';

import styles from './MethodPage.module.css';

const STAGES = [1, 2, 3, 4, 5, 6, 7] as const;

/** Who Rewire is for, what it solves and the whole journey, before the method. */
export function JourneyOverview() {
  const { t } = useMessages();
  return (
    <>
      <section className={styles.about} aria-label={t('about.eyebrow')}>
        <div>
          <h2>{t('about.who.title')}</h2>
          <p>{t('about.who.body')}</p>
        </div>
        <div>
          <h2>{t('about.problem.title')}</h2>
          <p>{t('about.problem.body')}</p>
        </div>
      </section>
      <section className={pageStyles.section} aria-labelledby="journey-overview">
        <h2 id="journey-overview">{t('about.journey.title')}</h2>
        <ol className={styles.steps}>
          {STAGES.map((stage) => (
            <li key={stage} className={styles.step}>
              <h3>{t(`about.journey.${stage}.title`)}</h3>
              <p>{t(`about.journey.${stage}.body`)}</p>
            </li>
          ))}
        </ol>
        <p className={styles.demo}>{t('method.journey.demo')}</p>
        <div>
          <ButtonLink primary to="/start">
            {t('home.welcome.start')}
          </ButtonLink>
        </div>
      </section>
    </>
  );
}
