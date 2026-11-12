import type { ColDef } from 'ag-grid-community';

/**
 * A column written as words: the same text is drawn in the cell and searched by the quick
 * filter, which otherwise reads the raw value (a code, cents or an ISO date).
 */
export function shownAs<T>(
  text: (data: T | undefined) => string,
): Pick<ColDef<T>, 'valueFormatter' | 'getQuickFilterText'> {
  return {
    valueFormatter: ({ data }) => text(data),
    getQuickFilterText: ({ data }) => text(data),
  };
}
