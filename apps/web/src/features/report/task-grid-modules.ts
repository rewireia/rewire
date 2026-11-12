import {
  CellStyleModule,
  ClientSideRowModelModule,
  ExternalFilterModule,
  LocaleModule,
  PinnedRowModule,
  RowAutoHeightModule,
  type Module,
} from 'ag-grid-community';

/**
 * Only the AG Grid features the task table uses: the week
 * pinned at the foot, the band filter outside the grid, rows as tall as their text, the
 * cell styles and the grid's own texts in the person's language.
 */
export const TASK_GRID_MODULES: Module[] = [
  ClientSideRowModelModule,
  PinnedRowModule,
  ExternalFilterModule,
  RowAutoHeightModule,
  CellStyleModule,
  LocaleModule,
];
