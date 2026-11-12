import type { ColDef, GetRowIdFunc } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { useMemo, type RefObject } from 'react';

import { actionKeys } from '../../components/grid-keyboard.ts';
import { useGridText } from '../../components/grid-locale.ts';
import { gridTheme } from '../../theme/grid-theme.ts';

import styles from './Dashboard.module.css';
import { DASHBOARD_MODULES } from './grid-modules.ts';

interface DashboardGridProps<T, C> {
  readonly label: string;
  /** The rows, memorised: a row that changes is a new object, and AG Grid redraws only it. */
  readonly rows: readonly T[];
  readonly columns: ColDef<T>[];
  readonly quickFilter: string;
  readonly getRowId: GetRowIdFunc<T>;
  /** The table's actions. AG Grid keeps the first context it is given, so it must not change. */
  readonly context?: C;
  readonly gridRef?: RefObject<AgGridReact<T> | null>;
  /** Rows kept at the foot of the table, outside sorting and filtering, such as totals. */
  readonly pinnedBottom?: readonly T[];
}

/** Every cell answers Enter with its action, and Tab goes through the actions of a cell. */
const DEFAULT_COLUMN: ColDef = { suppressKeyboardEvent: actionKeys };

const NO_ROWS: readonly never[] = [];

/** A table of the dashboard: the Rewire theme, its height fitted to its rows by AG Grid. */
export function DashboardGrid<T, C>(props: DashboardGridProps<T, C>) {
  const { label, rows, columns, quickFilter, getRowId, context, gridRef } = props;
  const pinnedBottom = props.pinnedBottom ?? NO_ROWS;
  const rowData = useMemo(() => [...rows], [rows]);
  const pinnedBottomRowData = useMemo(() => [...pinnedBottom], [pinnedBottom]);
  const getLocaleText = useGridText('dashboard.filter.none');
  return (
    <div className={styles.grid} role="region" aria-label={label}>
      <AgGridReact<T>
        ref={gridRef}
        modules={DASHBOARD_MODULES}
        theme={gridTheme}
        rowData={rowData}
        pinnedBottomRowData={pinnedBottomRowData}
        columnDefs={columns}
        defaultColDef={DEFAULT_COLUMN}
        context={context}
        getRowId={getRowId}
        quickFilterText={quickFilter}
        // A phone hides some columns; the filter still finds a row by them, as on a wide screen.
        includeHiddenColumnsInQuickFilter
        getLocaleText={getLocaleText}
        domLayout="autoHeight"
      />
    </div>
  );
}
