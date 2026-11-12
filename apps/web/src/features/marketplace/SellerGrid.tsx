import {
  CellStyleModule,
  ClientSideRowModelModule,
  LocaleModule,
  PaginationModule,
  QuickFilterModule,
  NumberEditorModule,
  type CellEditRequestEvent,
  type ColDef,
  type GetRowIdFunc,
  type Module,
} from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { useMemo } from 'react';

import { actionKeys } from '../../components/grid-keyboard.ts';
import { useGridText } from '../../components/grid-locale.ts';
import { NARROW_SCREEN, useMediaQuery } from '../../components/use-media-query.ts';
import { gridTheme } from '../../theme/grid-theme.ts';

import styles from './Business.module.css';

/** Only the AG Grid features the seller's tables use. */
const SELLER_MODULES: Module[] = [
  ClientSideRowModelModule,
  QuickFilterModule,
  PaginationModule,
  CellStyleModule,
  LocaleModule,
  NumberEditorModule,
];

/** Every cell answers Enter with its action, and Tab goes through the actions of a cell. */
const DEFAULT_COLUMN: ColDef = { suppressKeyboardEvent: actionKeys, sortable: true, flex: 1 };

const FIRST_PAGE_SIZE = 20;
const PAGE_SIZES = [FIRST_PAGE_SIZE, 50, 100];

interface SellerGridProps<T> {
  readonly label: string;
  readonly rows: readonly T[];
  readonly columns: ColDef<T>[];
  readonly quickFilter: string;
  readonly getRowId: GetRowIdFunc<T>;
  /** An edit typed in a cell: the grid never changes its rows, the server's answer does. */
  readonly onEdit?: (event: CellEditRequestEvent<T>) => void;
}

/**
 * A long table of the seller workspace: the house theme, a page of rows at a time, its height
 * fitted to the page, so a catalogue of two thousand courses stays quick and readable.
 */
export function SellerGrid<T>({
  label,
  rows,
  columns,
  quickFilter,
  getRowId,
  onEdit,
}: SellerGridProps<T>) {
  const narrow = useMediaQuery(NARROW_SCREEN);
  const rowData = useMemo(() => [...rows], [rows]);
  const getLocaleText = useGridText('dashboard.filter.none');
  return (
    <div className={styles.grid} role="region" aria-label={label}>
      <AgGridReact<T>
        modules={SELLER_MODULES}
        theme={gridTheme}
        rowData={rowData}
        columnDefs={columns}
        defaultColDef={DEFAULT_COLUMN}
        getRowId={getRowId}
        quickFilterText={quickFilter}
        includeHiddenColumnsInQuickFilter
        getLocaleText={getLocaleText}
        domLayout="autoHeight"
        rowHeight={narrow ? 56 : 48}
        pagination
        paginationPageSize={FIRST_PAGE_SIZE}
        // A phone keeps the page arrows only: the size of a page is chosen on a wide screen.
        paginationPageSizeSelector={narrow ? false : PAGE_SIZES}
        readOnlyEdit
        singleClickEdit
        stopEditingWhenCellsLoseFocus
        {...(onEdit === undefined ? {} : { onCellEditRequest: onEdit })}
      />
    </div>
  );
}
