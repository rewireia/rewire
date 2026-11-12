import type { ListedEnrolment } from '@rewire/contracts';

import pageStyles from '../../app/Page.module.css';
import buttonStyles from '../../components/Button.module.css';
import { cx } from '../../components/cx.ts';
import { useMessages } from '../../i18n/use-messages.ts';

import styles from './Learn.module.css';

/** A listed course the learner bought: what the enrolment means, and the way to the provider. */
export function ListedCourseView({ enrolment }: { readonly enrolment: ListedEnrolment }) {
  const { t } = useMessages();
  const { provider } = enrolment;
  return (
    <header className={pageStyles.intro}>
      <span className={pageStyles.eyebrow}>
        {t('learnListed.eyebrow')} · {t(`learn.status.${enrolment.status}`)}
      </span>
      <h1 lang="en">{enrolment.title}</h1>
      <p className={pageStyles.lede}>{t('learnListed.enrolled', { provider })}</p>
      <p className={styles.small}>{t('learnListed.body')}</p>
      {enrolment.hours !== null && (
        <p className={styles.small}>{t('learnListed.hours', { hours: enrolment.hours })}</p>
      )}
      <p>
        <a
          className={cx(buttonStyles.button, buttonStyles.primary)}
          href={enrolment.url}
          target="_blank"
          rel="noopener noreferrer"
        >
          {t('learnListed.open', { provider })} <span aria-hidden="true">↗</span>
          <span className={styles.hidden}>{t('learnListed.newTab')}</span>
        </a>
      </p>
    </header>
  );
}
