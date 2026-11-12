import type { ReactNode } from 'react';

import styles from './BigFigure.module.css';

interface BigFigureProps {
  readonly label: string;
  readonly value: string;
  readonly sentence: ReactNode;
  /** True while a newer value is on its way. */
  readonly updating?: boolean;
}

/** One of the large figures of the report: a small label, the figure and what it means. */
export function BigFigure({ label, value, sentence, updating = false }: BigFigureProps) {
  return (
    <figure className={styles.figure}>
      <span className={styles.label}>{label}</span>
      <span className={styles.value} data-updating={updating}>
        {value}
      </span>
      <figcaption className={styles.sentence}>{sentence}</figcaption>
    </figure>
  );
}
