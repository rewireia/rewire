import { themeQuartz } from 'ag-grid-community';

/**
 * The AG Grid theme, built from the design tokens. Every colour is a CSS custom property,
 * so the same theme follows the light and the dark palette.
 */
export const gridTheme = themeQuartz.withParams({
  // The grid follows the page's colour scheme, so `light-dark()` tokens resolve as on the page.
  browserColorScheme: 'inherit',
  accentColor: 'var(--accent)',
  backgroundColor: 'var(--surface)',
  foregroundColor: 'var(--ink)',
  textColor: 'var(--ink)',
  subtleTextColor: 'var(--ink-2)',
  borderColor: 'var(--line)',
  chromeBackgroundColor: 'var(--surface)',
  headerBackgroundColor: 'var(--sunken)',
  headerTextColor: 'var(--ink-2)',
  headerFontFamily: 'var(--font-mono)',
  headerFontSize: 12,
  headerFontWeight: 500,
  fontFamily: 'var(--font-text)',
  fontSize: 15,
  dataFontSize: 15,
  rowHoverColor: 'var(--sunken)',
  selectedRowBackgroundColor: 'var(--accent-soft)',
  oddRowBackgroundColor: 'var(--surface)',
  rowBorder: { color: 'var(--line)', width: 1 },
  columnBorder: false,
  headerRowBorder: { color: 'var(--line)', width: 1 },
  // Rows pinned at the foot are totals: set apart by a line of ink, as in a ledger.
  pinnedRowBorder: { color: 'var(--ink)', width: 1 },
  pinnedRowFontWeight: 500,
  wrapperBorder: false,
  wrapperBorderRadius: 12,
  borderRadius: 6,
  iconColor: 'var(--ink-2)',
  rowHeight: 48,
  // A table laid out to fit its rows measures exactly them, never less than one row: no empty
  // band under a short table, and room for the sentence of a table whose rows are all filtered.
  autoHeightMinBodyHeight: 48,
  headerHeight: 44,
  spacing: 8,
  focusShadow: { radius: 2, spread: 2, color: 'var(--accent)' },
  checkboxBorderRadius: 4,
  checkboxCheckedBackgroundColor: 'var(--accent)',
  checkboxCheckedBorderColor: 'var(--accent)',
  checkboxCheckedShapeColor: 'var(--accent-ink)',
});
