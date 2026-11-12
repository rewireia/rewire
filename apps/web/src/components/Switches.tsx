import {
  updatePreferences,
  usePreferences,
  type Language,
  type ThemeChoice,
} from '../app/preferences.ts';
import { useMessages } from '../i18n/use-messages.ts';

import { Capsule } from './Capsule.tsx';
import { Icon } from './Icon.tsx';
import styles from './Switches.module.css';
import { useMediaQuery } from './use-media-query.ts';

const LANGUAGES: readonly { readonly value: Language; readonly name: string }[] = [
  { value: 'en', name: 'English' },
  { value: 'es', name: 'Español' },
];

/** The language of the interface, EN or ES, each named in its own language. */
export function LanguageCapsule() {
  const { t } = useMessages();
  const { language } = usePreferences();
  return (
    <Capsule<Language>
      legend={t('language.label')}
      hideLegend
      options={LANGUAGES.map((option) => ({
        value: option.value,
        label: option.value.toUpperCase(),
        name: option.name,
      }))}
      value={language}
      onChange={(next) => {
        updatePreferences({ language: next });
      }}
    />
  );
}

/** The theme as the system has it (the default), or the one the person chose. */
export function ThemeCapsule() {
  const { t } = useMessages();
  const { theme } = usePreferences();
  return (
    <Capsule<ThemeChoice>
      legend={t('theme.label')}
      fill
      options={[
        { value: 'system', label: t('theme.system'), name: t('theme.system.name') },
        { value: 'light', label: t('theme.light') },
        { value: 'dark', label: t('theme.dark') },
      ]}
      value={theme}
      onChange={(next) => {
        updatePreferences({ theme: next });
      }}
    />
  );
}

/** The sun or the moon of the header: one press turns the page light or dark. */
export function ThemeToggle() {
  const { t } = useMessages();
  const { theme } = usePreferences();
  const systemDark = useMediaQuery('(prefers-color-scheme: dark)');
  const dark = theme === 'system' ? systemDark : theme === 'dark';
  return (
    <button
      type="button"
      className={styles.toggle}
      aria-label={dark ? t('theme.toLight') : t('theme.toDark')}
      onClick={() => {
        updatePreferences({ theme: dark ? 'light' : 'dark' });
      }}
    >
      <Icon name={dark ? 'sun' : 'moon'} />
    </button>
  );
}
