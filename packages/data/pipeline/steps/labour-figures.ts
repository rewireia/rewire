import { compareCodes } from './compare-codes.ts';

/**
 * Figures keyed by code, in code order, so the same source always gives the same bytes. A code
 * given twice means the step misread its source, so it fails instead of keeping either figure.
 */
export function figuresByCode(
  entries: Iterable<readonly [string, number]>,
): Record<string, number> {
  const figures = new Map<string, number>();
  for (const [code, value] of entries) {
    if (figures.has(code)) {
      throw new Error(`the source gives two figures for ${code}`);
    }
    figures.set(code, value);
  }
  return Object.fromEntries([...figures].toSorted(([a], [b]) => compareCodes(a, b)));
}

/** Fails when an API response holds fewer records than a complete one does. */
export function requireRecords(what: string, count: number, minimum: number): void {
  if (count < minimum) {
    throw new Error(`${what} holds ${count} records; at least ${minimum} were expected`);
  }
}
