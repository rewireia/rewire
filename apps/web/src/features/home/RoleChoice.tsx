import { Icon } from '../../components/Icon.tsx';
import { useMessages } from '../../i18n/use-messages.ts';

import styles from './RoleChoice.module.css';

/** The two ways into Rewire, on the same photograph as the opening. */
export function RoleChoice({
  onChoose,
}: {
  readonly onChoose: (role: 'learner' | 'business') => void;
}) {
  const { t } = useMessages();
  return (
    <section className={styles.choice} aria-labelledby="role-choice-title">
      <p className={styles.eyebrow}>{t('home.choice.eyebrow')}</p>
      <h2 id="role-choice-title">{t('home.choice.title')}</h2>
      <nav aria-label={t('home.choice.label')} className={styles.options}>
        <button
          type="button"
          onClick={() => {
            onChoose('learner');
          }}
          className={styles.option}
        >
          <span>
            <strong>{t('home.choice.learner')}</strong>
            <small>{t('home.choice.learnerBody')}</small>
          </span>
          <Icon name="arrow" size={20} />
        </button>
        <button
          type="button"
          onClick={() => {
            onChoose('business');
          }}
          className={styles.option}
        >
          <span>
            <strong>{t('home.choice.business')}</strong>
            <small>{t('home.choice.businessBody')}</small>
          </span>
          <Icon name="arrow" size={20} />
        </button>
      </nav>
    </section>
  );
}
