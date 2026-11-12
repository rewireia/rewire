import type { ReactNode } from 'react';

import styles from './Story.module.css';

interface StoryFigureProps {
  /** The conclusion the chart shows, as its title. */
  readonly title: string;
  /** How to read the chart: what is measured, in which unit. */
  readonly caption: string;
  /** The chart itself, hidden from assistive technology. */
  readonly chart: ReactNode;
  /** The same figures in words, one line each, for assistive technology. */
  readonly lines: readonly string[];
  /** How fine the figures are, when that needs saying. */
  readonly level?: string | undefined;
  readonly wide?: boolean;
}

/** One chart of the story: its conclusion, the chart, the figures in words and their level. */
export function StoryFigure(props: StoryFigureProps) {
  const { title, caption, chart, lines, level, wide = false } = props;
  return (
    <figure className={styles.figure} data-wide={wide || undefined}>
      <h3 className={styles.figureTitle}>{title}</h3>
      <p className={styles.figureCaption}>{caption}</p>
      <div aria-hidden="true" className={styles.chart}>
        {chart}
      </div>
      <ul className="visually-hidden">
        {lines.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
      {level !== undefined && (
        <figcaption className={styles.source}>
          <span>{level}</span>
        </figcaption>
      )}
    </figure>
  );
}
