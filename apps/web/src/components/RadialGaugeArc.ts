/** The drawing box of a gauge: a half circle on a 200 × 112 canvas. */
export const GAUGE_BOX = { width: 200, height: 112, cx: 100, cy: 100, radius: 84 } as const;

/** One coloured stretch of the dial, in the units of the scale (between its minimum and maximum). */
export interface GaugeBand {
  readonly from: number;
  readonly to: number;
  /** A CSS colour, usually a token such as `var(--band-high)`. */
  readonly color: string;
  /** The name of the stretch, such as "High"; it is the caption when the value falls in it. */
  readonly label: string;
}

/** A value placed on a scale, as a fraction from 0 to 1, kept inside the scale. */
export function gaugeFraction(value: number, min: number, max: number): number {
  if (![value, min, max].every(Number.isFinite) || max <= min) {
    return 0;
  }
  return Math.min(1, Math.max(0, (value - min) / (max - min)));
}

/** The point of the dial at a fraction: 0 is the left end, 1 the right end, 0.5 the top. */
export function pointAt(fraction: number, radius: number = GAUGE_BOX.radius) {
  const angle = Math.PI * (1 - fraction);
  const round = (n: number) => Math.round(n * 100) / 100;
  return {
    x: round(GAUGE_BOX.cx + radius * Math.cos(angle)),
    y: round(GAUGE_BOX.cy - radius * Math.sin(angle)),
  };
}

/** The SVG path of the dial between two fractions, drawn clockwise over the top. */
export function arcPath(from: number, to: number, radius: number = GAUGE_BOX.radius): string {
  const start = pointAt(from, radius);
  const end = pointAt(to, radius);
  return `M ${start.x} ${start.y} A ${radius} ${radius} 0 0 1 ${end.x} ${end.y}`;
}

/** The band a value falls in; the last band holds the maximum of the scale. */
export function bandAt(bands: readonly GaugeBand[], value: number): GaugeBand | undefined {
  return (
    bands.find((band) => value >= band.from && value < band.to) ??
    (value >= (bands.at(-1)?.to ?? Infinity) ? bands.at(-1) : undefined)
  );
}

/** Space left between two bands, as a fraction of the scale. */
const BAND_GAP = 0.006;

/** The path of each band on the dial, with a fine gap between neighbours. */
export function bandPaths(
  bands: readonly GaugeBand[],
  min: number,
  max: number,
): readonly { readonly band: GaugeBand; readonly d: string }[] {
  return bands.map((band) => {
    const from = gaugeFraction(band.from, min, max);
    const to = gaugeFraction(band.to, min, max);
    const gap = Math.min(BAND_GAP, (to - from) / 4);
    return { band, d: arcPath(from + (from > 0 ? gap : 0), to - (to < 1 ? gap : 0)) };
  });
}

/** What a gauge shows for a value: where it sits, its band, its figure and its words. */
export function gaugeReading({
  value,
  min,
  max,
  bands,
  display,
  unit,
  valueText,
  caption,
}: {
  readonly value: number | null;
  readonly min: number;
  readonly max: number;
  readonly bands: readonly GaugeBand[];
  readonly display?: string | undefined;
  readonly unit?: string | undefined;
  readonly valueText?: string | undefined;
  readonly caption?: string | undefined;
}) {
  if (value === null || !Number.isFinite(value)) {
    return null;
  }
  const kept = Math.min(max, Math.max(min, value));
  const band = bandAt(bands, kept);
  const figure = display ?? String(Math.round(kept));
  return {
    value: kept,
    fraction: gaugeFraction(kept, min, max),
    band,
    figure,
    caption: caption ?? band?.label,
    valueText: valueText ?? [`${figure}${unit ?? ''}`, band?.label].filter(Boolean).join(', '),
  };
}
