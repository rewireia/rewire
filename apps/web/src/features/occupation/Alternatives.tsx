import type { UnitGroupLink } from '@rewire/contracts';

import pageStyles from '../../app/Page.module.css';
import { useMessages } from '../../i18n/use-messages.ts';

import styles from './ConfirmPage.module.css';

interface AlternativesProps {
  readonly links: readonly UnitGroupLink[];
  readonly current: string;
  readonly onChoose: (isco08: string) => void;
}

/** Other international groups the occupation is linked to. Choosing one shows its tasks. */
export function Alternatives({ links, current, onChoose }: AlternativesProps) {
  const { t } = useMessages();
  if (links.length < 2) {
    return null;
  }
  return (
    <section className={pageStyles.section} aria-labelledby="confirm-alternatives">
      <h2 id="confirm-alternatives">{t('confirm.alternatives')}</h2>
      <ul className={styles.alternatives}>
        {links.map((link) => {
          const isCurrent = link.isco08 === current;
          return (
            <li key={link.isco08}>
              <button
                type="button"
                className={styles.alternative}
                aria-current={isCurrent}
                onClick={() => {
                  onChoose(link.isco08);
                }}
              >
                <span className={styles.alternativeTitle}>
                  {link.title ?? t('confirm.untitledGroup')}
                </span>
                <span className={styles.aside}>
                  {isCurrent && t('confirm.current')}
                  {!isCurrent && link.scored && <span className="mono">{link.isco08}</span>}
                  {!isCurrent && !link.scored && t('confirm.unscoredShort')}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
