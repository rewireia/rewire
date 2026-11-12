import { useRegions } from '../../api/queries.ts';
import { usePreferences } from '../../app/preferences.ts';
import { formatList } from '../../i18n/format.ts';
import { useMessages } from '../../i18n/use-messages.ts';

import styles from './RegionFacts.module.css';

/** What the classification of the chosen region holds, from the API's own counts. */
export function RegionFacts() {
  const { t, language } = useMessages();
  const { region } = usePreferences();
  const regions = useRegions();
  const summary = regions.data?.regions.find((entry) => entry.region === region);
  if (summary === undefined) {
    return <p className={styles.facts}>&nbsp;</p>;
  }
  const { classification } = summary;
  const names = new Intl.DisplayNames(language, { type: 'language' });
  const languages = classification.languages.map((code) => names.of(code) ?? code);
  return (
    <p className={styles.facts} aria-live="polite">
      {t('home.region.facts', {
        classification: `${classification.name} ${classification.version}`,
        publisher: classification.publisher,
        occupations: classification.occupations,
        titles: classification.jobTitles,
        languages: formatList(languages, language),
      })}
    </p>
  );
}
