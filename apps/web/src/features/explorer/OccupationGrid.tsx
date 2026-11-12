import type { UnitGroupSummary } from '@rewire/contracts';
import type { ColDef, RowClickedEvent, SuppressKeyboardEventParams } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { useMemo, type RefObject } from 'react';
import { useNavigate } from 'react-router';

import { usePreferences } from '../../app/preferences.ts';
import { useGridText } from '../../components/grid-locale.ts';
import { NARROW_SCREEN, useMediaQuery } from '../../components/use-media-query.ts';
import { useMessages } from '../../i18n/use-messages.ts';
import { gridTheme } from '../../theme/grid-theme.ts';

import { columnsFor, reportOf } from './columns.tsx';
import styles from './ExplorerPage.module.css';
import { GRID_MODULES } from './grid-modules.ts';

interface OccupationGridProps {
  readonly gridRef: RefObject<AgGridReact<UnitGroupSummary> | null>;
  readonly rows: readonly UnitGroupSummary[];
  readonly text: string;
  readonly mine: string | undefined;
  /** How many rows the table shows after every filter, each time it changes. */
  readonly onShownChange: (shown: number) => void;
}

/**
 * The AG Grid table. The title links to the report; a click anywhere on the row or Enter on any
 * of its cells opens it too. The person's own row carries the accent line.
 */
export function OccupationGrid({ gridRef, rows, text, mine, onShownChange }: OccupationGridProps) {
  const messages = useMessages();
  const preferences = usePreferences();
  const navigate = useNavigate();
  const narrow = useMediaQuery(NARROW_SCREEN);
  const columns = useMemo(() => columnsFor(messages, narrow), [messages, narrow]);
  const rowData = useMemo(() => [...rows], [rows]);
  const getLocaleText = useGridText('explore.none');
  const open = (data: UnitGroupSummary | undefined) => {
    if (data !== undefined) {
      void navigate(reportOf(data.isco08, preferences));
    }
  };
  const onRowClicked = ({ data, event }: RowClickedEvent<UnitGroupSummary>) => {
    // A click on the title's own link is already followed by the link.
    if (!(event?.target instanceof Element && event.target.closest('a') !== null)) {
      open(data);
    }
  };
  // Enter on any cell opens the row's report, before AG Grid handles the key.
  const enterOpens = ({ event, data }: SuppressKeyboardEventParams<UnitGroupSummary>) => {
    if (event.type !== 'keydown' || event.key !== 'Enter') {
      return false;
    }
    event.preventDefault();
    open(data);
    return true;
  };
  const defaultColDef: ColDef<UnitGroupSummary> = { suppressKeyboardEvent: enterOpens };
  return (
    <div className={styles.grid}>
      <AgGridReact<UnitGroupSummary>
        ref={gridRef}
        modules={GRID_MODULES}
        theme={gridTheme}
        rowData={rowData}
        columnDefs={columns}
        defaultColDef={defaultColDef}
        getRowId={({ data }) => data.isco08}
        quickFilterText={text}
        // A phone hides some columns; the filter still finds a row by them, as on a wide screen.
        includeHiddenColumnsInQuickFilter
        rowClassRules={{ mine: ({ data }) => data?.isco08 === mine }}
        getLocaleText={getLocaleText}
        onModelUpdated={({ api }) => {
          onShownChange(api.getDisplayedRowCount());
        }}
        onRowClicked={onRowClicked}
      />
    </div>
  );
}
