import { useId } from 'react';

import { MARK_FACES, MARK_VIEWBOX } from './brand-mark.ts';
import styles from './Mark.module.css';

interface MarkProps {
  readonly size?: number;
  readonly animated?: boolean;
}

/** The folded violet triangle, with unique paint ids when several marks share a page. */
export function Mark({ size = 24, animated = false }: MarkProps) {
  const id = useId();
  return (
    <svg
      className={styles.mark}
      width={size}
      height={size}
      viewBox={MARK_VIEWBOX}
      data-animated={animated}
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        {MARK_FACES.map((face) => (
          <linearGradient key={face.name} id={`${id}-${face.name}`} x2="0.8" y2="1">
            <stop stopColor={`var(--mark-${face.name}-start)`} />
            <stop offset="1" stopColor={`var(--mark-${face.name}-end)`} />
          </linearGradient>
        ))}
      </defs>
      {MARK_FACES.map((face) => (
        <path
          key={face.name}
          className={styles.face}
          d={face.path}
          fill={`url(#${id}-${face.name})`}
          pathLength={1}
        />
      ))}
    </svg>
  );
}
