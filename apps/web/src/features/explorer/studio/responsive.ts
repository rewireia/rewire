import type {
  AgResponsiveLayoutBreakpoint,
  AgResponsiveLayoutCandidate,
  AgWidgetLayoutState,
} from 'ag-studio';

/**
 * Below this canvas width widgets reflow: a 1,440 px screen gives the canvas about 860 px, a
 * 1,280 px one about 700 px.
 */
const NARROW_CANVAS = 800;

/**
 * The layout on a narrower canvas: a widget narrower than half the page takes half of it, any
 * other the whole width, placed in reading order, left to right and row by row. Returned in the
 * order it was given.
 */
export function flowLayout(
  candidates: readonly AgResponsiveLayoutCandidate[],
  columns: number,
): AgWidgetLayoutState[] {
  const order = candidates
    .map((candidate, index) => ({ ...candidate, index }))
    .sort((a, b) => a.layout.yTrack - b.layout.yTrack || a.layout.xTrack - b.layout.xTrack);
  const placed: AgWidgetLayoutState[] = [];
  let x = 0;
  let y = 0;
  let rowHeight = 0;
  for (const { layout, minSize, index } of order) {
    const half = Math.floor(columns / 2);
    const xSpan = layout.xSpan >= half ? columns : Math.min(columns, Math.max(minSize.xSpan, half));
    if (x + xSpan > columns) {
      y += rowHeight;
      x = 0;
      rowHeight = 0;
    }
    placed[index] = { xTrack: x, yTrack: y, xSpan, ySpan: layout.ySpan };
    x += xSpan;
    rowHeight = Math.max(rowHeight, layout.ySpan);
  }
  return placed;
}

/** The layouts of the dashboard between a 1,024 px and a 1,440 px screen. */
export const BREAKPOINTS: AgResponsiveLayoutBreakpoint[] = [
  { maxWidth: NARROW_CANVAS - 1, layout: (layouts, state) => flowLayout(layouts, state.columns) },
];
