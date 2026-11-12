/** One bar of the histogram: occupations whose mean score falls in `[from, to)`. */
export interface HistogramBin {
  /** Lower edge, in points from 0 to 100. */
  readonly from: number;
  readonly to: number;
  readonly count: number;
  readonly mine: boolean;
}

/** Spreads scores from 0 to 1 over `bins` equal bars; a score of 1 goes in the last one. */
export function histogramOf(
  scores: readonly number[],
  bins: number,
  mine: number | null = null,
): readonly HistogramBin[] {
  const binOf = (score: number) => Math.min(Math.floor(score * bins), bins - 1);
  const counts = new Array<number>(bins).fill(0);
  for (const score of scores) {
    counts[binOf(score)] = (counts[binOf(score)] ?? 0) + 1;
  }
  const mineBin = mine === null ? -1 : binOf(mine);
  const step = 100 / bins;
  return counts.map((count, index) => ({
    from: Math.round(index * step),
    to: Math.round((index + 1) * step),
    count,
    mine: index === mineBin,
  }));
}
