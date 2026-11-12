import type { Reading } from '@rewire/contracts';

import { Icon } from '../../components/Icon.tsx';
import { useMessages } from '../../i18n/use-messages.ts';

import { durationOf } from './duration.ts';
import styles from './Library.module.css';

/** The name of a two-letter language in the reader's language, such as "English" or "inglés". */
function languageName(code: string, language: string): string {
  return new Intl.DisplayNames([language], { type: 'language' }).of(code) ?? code;
}

/** One reading: its kind and level, the publisher's title, who publishes it and why to read it. */
export function ReadingCard({ reading }: { readonly reading: Reading }) {
  const { t, language } = useMessages();
  const titleId = `reading-${reading.id}`;
  const duration = durationOf(reading.minutes);
  return (
    <article className={styles.card} aria-labelledby={titleId}>
      <p className={styles.kind}>
        <span className={styles.type} data-type={reading.type}>
          {t(`library.type.${reading.type}`)}
        </span>
        <span>{t(`library.level.${reading.level}`)}</span>
      </p>
      <h2 id={titleId} className={styles.title}>
        {reading.title}
      </h2>
      <p className={styles.source}>
        {reading.source} · {reading.year}
      </p>
      <p className={styles.meta}>
        <span>
          {duration.unit === 'minutes'
            ? t('library.minutes', { minutes: duration.value })
            : t('library.hours', { hours: duration.value })}
        </span>
        <span>{languageName(reading.language, language)}</span>
        <span>{t(`library.format.${reading.format}`)}</span>
      </p>
      <div className={styles.why}>
        <h3>{t('library.why')}</h3>
        <p>{reading.why}</p>
      </div>
      <a className={styles.open} href={reading.url} target="_blank" rel="noopener noreferrer">
        {t('library.open')}
        <span className="visually-hidden"> {t('library.newTab')}</span>
        <Icon name="arrow" size={18} />
      </a>
    </article>
  );
}
