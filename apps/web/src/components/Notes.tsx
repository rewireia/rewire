import { useMessages } from '../i18n/use-messages.ts';

import styles from './Notes.module.css';

/** In Spanish, explains how official classification titles are presented. */
export function OfficialLanguageNote() {
  const { t, language } = useMessages();
  if (language === 'en') {
    return null;
  }
  return <p className={styles.language}>{t('officialLanguage.note')}</p>;
}
