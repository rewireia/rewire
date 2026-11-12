import type { TaskBand } from '@rewire/contracts';
import type { CSSProperties } from 'react';

import styles from './Probe.module.css';

interface ProbeProps {
  readonly score: number;
  readonly band: TaskBand;
  readonly range?: { readonly low: number; readonly high: number };
}

const TICKS = [0.25, 0.5, 0.75] as const;

/** Places of the marks, as custom properties the stylesheet reads. */
type ProbeStyle = CSSProperties & Record<'--score' | '--low' | '--high', number>;

/** A score drawn as a sounding line. Decorative: the figure beside it carries the value. */
export function Probe({ score, band, range }: ProbeProps) {
  const style: ProbeStyle = {
    '--score': score,
    '--low': range?.low ?? score,
    '--high': range?.high ?? score,
  };
  return (
    <div className={styles.probe} data-band={band} style={style} aria-hidden="true">
      <span className={styles.line} />
      {TICKS.map((tick) => (
        <span key={tick} className={styles.tick} style={{ left: `${tick * 100}%` }} />
      ))}
      {range !== undefined && <span className={styles.range} />}
      <span className={styles.dot} />
    </div>
  );
}
