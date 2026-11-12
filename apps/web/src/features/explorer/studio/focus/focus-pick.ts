/** A row of the widget's data: the occupation code and, when mapped, the figure it is ranked by. */
export type FocusRow = Readonly<Record<string, unknown>>;

export interface FocusPick {
  /** The code of the occupation in focus, or `null` when no occupation is left. */
  readonly isco08: string | null;
  /** How many occupations the dashboard's filters leave. */
  readonly among: number;
}

const ISCO08 = /^\d{4}$/;

/**
 * The occupation the widget shows: the only one the filters leave or, among several, the one that
 * ranks first by the mapped figure (the most exposed, in the shipped dashboard).
 */
export function pickOccupation(
  rows: readonly FocusRow[],
  codeKey: string,
  rankKey: string | undefined,
): FocusPick {
  const candidates = rows.flatMap((row) => {
    const code = row[codeKey];
    const rank = rankKey === undefined ? 0 : row[rankKey];
    return typeof code === 'string' && ISCO08.test(code)
      ? [{ code, rank: typeof rank === 'number' ? rank : 0 }]
      : [];
  });
  const best = candidates.reduce<(typeof candidates)[number] | undefined>(
    (top, candidate) => (top === undefined || candidate.rank > top.rank ? candidate : top),
    undefined,
  );
  return { isco08: best?.code ?? null, among: candidates.length };
}
