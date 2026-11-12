import { regionSchema, type Region } from '@rewire/contracts';
import { useId } from 'react';

import { updatePreferences, usePreferences } from '../../../app/preferences.ts';
import { useMessages } from '../../../i18n/use-messages.ts';

import styles from './Story.module.css';

/**
 * The region of the page as a band of three segments under the page header. It changes the same
 * preference as the region of the menu, so the rest of the site follows it.
 */
export function RegionBand() {
  const { t } = useMessages();
  const { region } = usePreferences();
  const name = useId();
  const choose = (next: Region) => {
    updatePreferences({ region: next });
  };
  return (
    <fieldset className={styles.band}>
      <legend className="visually-hidden">{t('insights.regions')}</legend>
      {regionSchema.options.map((value) => (
        <label key={value} className={styles.segment}>
          <input
            type="radio"
            name={name}
            value={value}
            checked={value === region}
            onChange={() => {
              choose(value);
            }}
          />
          <span className={styles.segmentCode} aria-hidden="true">
            {value.toUpperCase()}
          </span>
          <span className={styles.segmentName}>{t(`region.${value}`)}</span>
        </label>
      ))}
    </fieldset>
  );
}
