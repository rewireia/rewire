import { useId, type CSSProperties } from 'react';

import styles from './Capsule.module.css';
import { cx } from './cx.ts';

interface CapsuleOption<T extends string> {
  readonly value: T;
  readonly label: string;
  /** The option's full name, when the label on screen is an abbreviation. */
  readonly name?: string;
}

interface CapsuleProps<T extends string> {
  readonly legend: string;
  readonly options: readonly CapsuleOption<T>[];
  readonly value: T;
  readonly onChange: (value: T) => void;
  readonly hideLegend?: boolean;
  /** Stretches the pill across its row, as in the menu. */
  readonly fill?: boolean;
}

/**
 * One choice among a few, as a pill whose filled thumb slides to the chosen option. Built on
 * native radio buttons: the group has a name and the arrow keys move between the options.
 */
export function Capsule<T extends string>(props: CapsuleProps<T>) {
  const { legend, options, value, onChange, hideLegend = false, fill = false } = props;
  const name = useId();
  const index = options.findIndex((option) => option.value === value);
  const place = { '--count': options.length, '--index': Math.max(index, 0) } as CSSProperties;
  return (
    <fieldset className={cx(styles.group, fill && styles.fill)}>
      <legend className={cx(styles.legend, hideLegend && 'visually-hidden')}>{legend}</legend>
      <div className={styles.pill} style={place}>
        {index >= 0 && <span className={styles.thumb} aria-hidden="true" />}
        {options.map((option) => (
          <label key={option.value} className={styles.option}>
            <input
              className={styles.input}
              type="radio"
              name={name}
              value={option.value}
              aria-label={option.name}
              checked={option.value === value}
              onChange={() => {
                onChange(option.value);
              }}
            />
            <span className={styles.text}>{option.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
