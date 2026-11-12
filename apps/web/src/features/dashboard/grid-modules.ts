import {
  CellStyleModule,
  ClientSideRowModelModule,
  CsvExportModule,
  LocaleModule,
  PinnedRowModule,
  QuickFilterModule,
  RowAutoHeightModule,
  type Module,
} from 'ag-grid-community';

/** Only the AG Grid features the dashboard uses. */
export const DASHBOARD_MODULES: Module[] = [
  ClientSideRowModelModule,
  QuickFilterModule,
  CsvExportModule,
  CellStyleModule,
  LocaleModule,
  RowAutoHeightModule,
  PinnedRowModule,
];
