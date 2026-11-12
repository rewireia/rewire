import { regionSchema, type Region } from '@rewire/contracts';
import { useEffect, useRef, useState } from 'react';

import { updatePreferences } from '../../app/preferences.ts';
import { useMessages } from '../../i18n/use-messages.ts';

import styles from './RegionGate.module.css';

/** Keeps focus inside the region dialog until its exit finishes and the choice is saved. */
function useRegionDialog(onChosen?: (region: Region) => void) {
  const dialog = useRef<HTMLDialogElement>(null);
  const timer = useRef<number | undefined>(undefined);
  const [leaving, setLeaving] = useState(false);
  const [selected, setSelected] = useState<Region | null>(null);
  useEffect(() => {
    const element = dialog.current;
    if (element !== null && !element.open) {
      element.showModal();
    }
    return () => {
      window.clearTimeout(timer.current);
      element?.close();
    };
  }, []);
  const choose = (region: Region) => {
    if (timer.current !== undefined) {
      return;
    }
    setSelected(region);
    setLeaving(true);
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    timer.current = window.setTimeout(
      () => {
        updatePreferences({ region });
        onChosen?.(region);
      },
      reduced ? 0 : 500,
    );
  };
  return { dialog, leaving, selected, choose };
}

/** A compact region choice over the existing scene, with no classification jargon. */
export function RegionGate({ onChosen }: { readonly onChosen?: (region: Region) => void }) {
  const { t } = useMessages();
  const { dialog, leaving, selected, choose } = useRegionDialog(onChosen);
  return (
    <dialog
      ref={dialog}
      className={styles.gate}
      data-leaving={leaving}
      aria-labelledby="region-gate-title"
      onCancel={(event) => {
        event.preventDefault();
      }}
    >
      <div className={styles.inner}>
        <span className={styles.eyebrow}>{t('gate.eyebrow')}</span>
        <h2 id="region-gate-title" className={styles.title}>
          {t('gate.title')}
        </h2>
        <ul className={styles.options}>
          {regionSchema.options.map((region) => (
            <li key={region}>
              <button
                type="button"
                className={styles.option}
                disabled={leaving}
                aria-pressed={selected === region}
                data-selected={selected === region}
                onClick={() => {
                  choose(region);
                }}
              >
                <span>{t(`region.${region}`)}</span>
                <span className={styles.indicator} aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      </div>
    </dialog>
  );
}
