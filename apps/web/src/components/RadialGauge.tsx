import { useId, type CSSProperties, type ReactNode } from 'react';

import {
  GAUGE_BOX,
  arcPath,
  bandPaths,
  gaugeReading,
  pointAt,
  type GaugeBand,
} from './RadialGaugeArc.ts';
import styles from './RadialGauge.module.css';

interface RadialGaugeProps {
  /** The short name of the measure, shown above the dial and given to assistive technology. */
  readonly label: string;
  /** `null` when there is nothing to measure yet: the dial stays unlit and `empty` is shown. */
  readonly value: number | null;
  /** The ends of the scale; 0 and 100 by default. */
  readonly min?: number | undefined;
  readonly max?: number | undefined;
  /** The coloured stretches of the dial, in the units of the scale, from `min` to `max`. */
  readonly bands: readonly GaugeBand[];
  /** The figure in the centre, already formatted; the rounded value by default. */
  readonly display?: string | undefined;
  /** A short unit after the figure, such as "/100" or "%". */
  readonly unit?: string | undefined;
  /** The value as a sentence for assistive technology; figure, unit and band by default. */
  readonly valueText?: string | undefined;
  /** The line under the dial; the label of the band the value falls in by default. */
  readonly caption?: string | undefined;
  /** What the figure rests on: its source and date, or a short explanation. */
  readonly note?: ReactNode | undefined;
  /** The empty state: a sentence and the way to the first step. */
  readonly empty?: ReactNode | undefined;
  /** The width of the dial: 200, 280 (default) or 340 px at most. */
  readonly size?: 'small' | 'medium' | 'large' | undefined;
}

const NEEDLE_INNER = GAUGE_BOX.radius - 15;
const NEEDLE_OUTER = GAUGE_BOX.radius + 11;
const SCALE_NUMBERS = new Intl.NumberFormat('en', { maximumFractionDigits: 1 });

/**
 * A half-circle gauge: coloured bands from one end of the scale to the other, the reached part
 * lit once from the minimum to the value, a fine needle and the figure large in the centre.
 * The dial is a `meter` with its value in words; without a value it has no role and the empty
 * state is shown, never a false zero.
 */
export function RadialGauge(props: RadialGaugeProps) {
  const { label, bands, unit, note, empty, min = 0, max = 100, size = 'medium' } = props;
  const labelId = useId();
  const state = gaugeReading({ ...props, min, max });
  const meter = state && {
    role: 'meter' as const,
    'aria-labelledby': labelId,
    'aria-valuemin': min,
    'aria-valuemax': max,
    'aria-valuenow': state.value,
    'aria-valuetext': state.valueText,
  };
  return (
    <figure className={styles.gauge} data-size={size} data-empty={state === null || undefined}>
      <figcaption id={labelId} className={styles.label}>
        {label}
      </figcaption>
      <div className={styles.dial} {...meter}>
        <GaugeDial bands={bands} min={min} max={max} fraction={state?.fraction ?? null} />
        <p className={styles.reading} aria-hidden="true">
          {state === null ? (
            <span className={styles.none}>—</span>
          ) : (
            <>
              <strong>{state.figure}</strong>
              {unit !== undefined && <span>{unit}</span>}
            </>
          )}
        </p>
      </div>
      <div className={styles.scale} aria-hidden="true">
        <span>{SCALE_NUMBERS.format(min)}</span>
        <span>{SCALE_NUMBERS.format(max)}</span>
      </div>
      {state?.caption !== undefined && (
        <p className={styles.caption}>
          {state.band !== undefined && (
            <span
              className={styles.swatch}
              style={{ background: state.band.color }}
              aria-hidden="true"
            />
          )}
          {state.caption}
        </p>
      )}
      {state === null && empty !== undefined && <div className={styles.empty}>{empty}</div>}
      {note !== undefined && <div className={styles.note}>{note}</div>}
    </figure>
  );
}

/** The drawing: faded bands, the reached part lit once through a mask, and the needle. */
function GaugeDial({
  bands,
  min,
  max,
  fraction,
}: {
  readonly bands: readonly GaugeBand[];
  readonly min: number;
  readonly max: number;
  readonly fraction: number | null;
}) {
  const maskId = useId();
  const paths = bandPaths(bands, min, max);
  const reached = fraction ?? 0;
  const turn = { '--gauge-fill': reached * 100, '--gauge-turn': `${reached * 180}deg` };
  const start = pointAt(0, NEEDLE_INNER);
  const tip = pointAt(0, NEEDLE_OUTER);
  return (
    <svg
      viewBox={`0 0 ${GAUGE_BOX.width} ${GAUGE_BOX.height}`}
      aria-hidden="true"
      focusable="false"
      style={turn as CSSProperties}
    >
      <defs>
        <mask id={maskId} maskUnits="userSpaceOnUse">
          <path className={styles.reach} d={arcPath(0, 1)} pathLength={100} />
        </mask>
      </defs>
      {paths.map(({ band, d }) => (
        <path key={`track-${band.from}`} className={styles.track} d={d} stroke={band.color} />
      ))}
      {fraction !== null && (
        <>
          <g mask={`url(#${maskId})`}>
            {paths.map(({ band, d }) => (
              <path key={`lit-${band.from}`} className={styles.lit} d={d} stroke={band.color} />
            ))}
          </g>
          <line className={styles.needle} x1={start.x} y1={start.y} x2={tip.x} y2={tip.y} />
        </>
      )}
    </svg>
  );
}
