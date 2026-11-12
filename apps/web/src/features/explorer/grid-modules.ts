import {
  CellApiModule,
  CellStyleModule,
  ClientSideRowModelModule,
  LocaleModule,
  QuickFilterModule,
  RowApiModule,
  RowStyleModule,
  ScrollApiModule,
  type Module,
} from 'ag-grid-community';

/** Only the AG Grid features the explorer uses, so the bundle carries no more. */
export const GRID_MODULES: Module[] = [
  ClientSideRowModelModule,
  QuickFilterModule,
  RowStyleModule,
  CellStyleModule,
  LocaleModule,
  RowApiModule,
  CellApiModule,
  ScrollApiModule,
];
