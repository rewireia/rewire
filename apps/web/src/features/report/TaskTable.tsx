import { type ExposureReport, type PersonalExposure, type TaskBand } from '@rewire/contracts';
import type { GridApi, GridReadyEvent, IRowNode } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { useEffect, useMemo, useRef, useState } from 'react';

import { useTranslatedTasks } from '../../components/task-translations.tsx';
import { useGridText } from '../../components/grid-locale.ts';
import { NARROW_SCREEN, useMediaQuery } from '../../components/use-media-query.ts';
import { useMessages } from '../../i18n/use-messages.ts';
import { gridTheme } from '../../theme/grid-theme.ts';

import { BandFilter } from './BandFilter.tsx';
import { taskColumns } from './task-columns.tsx';
import { TASK_GRID_MODULES } from './task-grid-modules.ts';
import { taskOf, taskRows, weekRow, type TaskRow } from './task-rows.ts';
import styles from './TaskTable.module.css';
import type { TimeByTask } from './times.ts';

export interface TaskTableProps {
  readonly report: ExposureReport;
  readonly personal: PersonalExposure;
  readonly timeByTask: TimeByTask;
}

/** The band filter, applied by AG Grid as an external filter each time it changes. */
function useBandFilter() {
  const [hidden, setHidden] = useState<ReadonlySet<TaskBand>>(new Set());
  const current = useRef(hidden);
  const api = useRef<GridApi<TaskRow> | null>(null);
  useEffect(() => {
    current.current = hidden;
    api.current?.onFilterChanged();
  }, [hidden]);
  // Only task rows are filtered: the week pinned at the foot stays outside every filter.
  const passes = ({ data }: IRowNode<TaskRow>) => {
    const task = taskOf(data);
    return task === undefined || !current.current.has(task.band);
  };
  const onGridReady = (event: GridReadyEvent<TaskRow>) => {
    api.current = event.api;
  };
  return { hidden, setHidden, passes, present: () => current.current.size > 0, onGridReady };
}

/** Read-only results with filtering and sorting. */
export function TaskTable(props: TaskTableProps) {
  const { report, personal, timeByTask } = props;
  const messages = useMessages();
  const translated = useTranslatedTasks(report.isco08);
  const { t } = messages;
  const narrow = useMediaQuery(NARROW_SCREEN);
  const filter = useBandFilter();
  const getLocaleText = useGridText('report.table.none');
  const columns = useMemo(
    () => taskColumns(messages, narrow, translated),
    [messages, narrow, translated],
  );
  const rows = useMemo<TaskRow[]>(() => [...taskRows(report, timeByTask)], [report, timeByTask]);
  const week = useMemo(() => [weekRow(t('report.week.label'), personal)], [t, personal]);
  return (
    <div className={styles.table}>
      <div className={styles.tools}>
        <BandFilter hidden={filter.hidden} onChange={filter.setHidden} />
      </div>
      <div className={styles.grid} role="region" aria-label={t('report.table.label')}>
        <AgGridReact<TaskRow>
          modules={TASK_GRID_MODULES}
          theme={gridTheme}
          rowData={rows}
          pinnedBottomRowData={week}
          columnDefs={columns}
          getRowId={({ data }) => data.id}
          getLocaleText={getLocaleText}
          domLayout="autoHeight"
          suppressCellFocus
          enableCellTextSelection
          isExternalFilterPresent={filter.present}
          doesExternalFilterPass={filter.passes}
          onGridReady={filter.onGridReady}
        />
      </div>
    </div>
  );
}
