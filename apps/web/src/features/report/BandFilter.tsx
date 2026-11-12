import type { TaskBand } from '@rewire/contracts';

import { useMessages } from '../../i18n/use-messages.ts';

import { BANDS_HIGH_FIRST } from './bands.ts';
import styles from './TaskTable.module.css';

interface BandFilterProps {
  readonly hidden: ReadonlySet<TaskBand>;
  readonly onChange: (hidden: ReadonlySet<TaskBand>) => void;
}

/** One checkbox per band; a cleared box hides the tasks of that band from the table. */
export function BandFilter({ hidden, onChange }: BandFilterProps) {
  const { t } = useMessages();
  const toggle = (band: TaskBand) => {
    const next = new Set(hidden);
    if (!next.delete(band)) {
      next.add(band);
    }
    onChange(next);
  };
  return (
    <fieldset className={styles.bands}>
      <legend className={styles.label}>{t('report.table.bands')}</legend>
      {BANDS_HIGH_FIRST.map((band) => (
        <label key={band} data-band={band}>
          <input
            type="checkbox"
            checked={!hidden.has(band)}
            onChange={() => {
              toggle(band);
            }}
          />
          <span className={styles.swatch} aria-hidden="true" />
          {t(`band.${band}`)}
        </label>
      ))}
    </fieldset>
  );
}
