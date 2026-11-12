import { timeShareSchema } from '@rewire/contracts';
import type { ColDef, ICellRendererParams } from 'ag-grid-community';

import type { useTranslatedTasks } from '../../components/task-translations.tsx';
import { useMessages, type Messages } from '../../i18n/use-messages.ts';

import { compareBands, compareShares, taskOf, type TaskRow } from './task-rows.ts';
import styles from './TaskTable.module.css';

type Cell = ICellRendererParams<TaskRow>;

/** Translated task text retains its English source in the tooltip. */
function TaskCell({
  data,
  translated,
}: Cell & { translated: ReturnType<typeof useTranslatedTasks> }) {
  if (data === undefined) return null;
  return data.kind === 'week' ? (
    data.text
  ) : (
    <span lang={translated.language(data)} title={translated.original(data)}>
      {translated.text(data)}
    </span>
  );
}

/** The score and band share a readable bar; the week has a figure and no band. */
function ScoreCell({ data }: Cell) {
  const { points, t } = useMessages();
  if (data === undefined) {
    return null;
  }
  if (data.kind === 'week') {
    return <span className={styles.points}>{data.score === null ? '—' : points(data.score)}</span>;
  }
  return (
    <span className={styles.score}>
      <span className={styles.scoreHeading}>
        <span className={styles.points}>{points(data.score)}</span>
        <span>{t(`band.${data.band}`)}</span>
      </span>
      <span
        className={styles.track}
        data-band={data.band}
        role="progressbar"
        aria-label={t('report.table.col.score')}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(data.score * 100)}
        aria-valuetext={`${points(data.score)} · ${t(`band.${data.band}`)}`}
      >
        <span className={styles.fill} style={{ width: `${data.score * 100}%` }} />
      </span>
    </span>
  );
}

/** Text columns: what a task row shows, and nothing on the week's row but its range. */
function textColumns({ t, points }: Messages): ColDef<TaskRow>[] {
  return [
    {
      colId: 'band',
      headerName: t('report.table.col.band'),
      valueGetter: ({ data }) => taskOf(data)?.band ?? null,
      valueFormatter: ({ data }) => {
        const task = taskOf(data);
        return task === undefined ? '' : t(`band.${task.band}`);
      },
      comparator: compareBands,
      width: 120,
      hide: true,
    },
    {
      colId: 'range',
      headerName: t('report.table.col.range'),
      // Sorted by how far apart the models were; shown as the two ends.
      valueGetter: ({ data }) => (data?.range ? data.range.high - data.range.low : null),
      valueFormatter: ({ data }) =>
        data?.range ? `${points(data.range.low)}–${points(data.range.high)}` : '',
      cellClass: 'mono',
      width: 140,
      hide: true,
    },
    {
      colId: 'reviewed',
      headerName: t('report.table.col.reviewed'),
      valueGetter: ({ data }) => taskOf(data)?.reviewed ?? null,
      valueFormatter: ({ value }) =>
        typeof value === 'boolean'
          ? t(value ? 'report.table.reviewed' : 'report.table.notReviewed')
          : '',
      width: 150,
      hide: true,
    },
  ];
}

/** Time chosen during the journey, shown without an editor. */
function timeColumn(t: Messages['t'], narrow: boolean): ColDef<TaskRow> {
  return {
    colId: 'share',
    headerName: t('report.table.col.time'),
    valueGetter: ({ data }) => taskOf(data)?.share ?? null,
    valueFormatter: ({ value }) => {
      const share = timeShareSchema.safeParse(value);
      return share.success ? t(`time.${share.data}`) : '';
    },
    comparator: compareShares,
    wrapText: true,
    autoHeight: true,
    wrapHeaderText: true,
    autoHeaderHeight: true,
    width: narrow ? 85 : 140,
  };
}

/** Three visible columns; model and review evidence remains available in CSV. */
export function taskColumns(
  messages: Messages,
  narrow: boolean,
  translated: ReturnType<typeof useTranslatedTasks>,
): ColDef<TaskRow>[] {
  const { t, points } = messages;
  return [
    {
      colId: 'task',
      headerName: t('report.table.col.task'),
      valueGetter: ({ data }) =>
        data === undefined ? '' : data.kind === 'week' ? data.text : translated.text(data),
      cellRenderer: TaskCell,
      cellRendererParams: { translated },
      flex: 1,
      minWidth: narrow ? 130 : 260,
      wrapText: true,
      autoHeight: true,
    },
    {
      colId: 'score',
      headerName: t('report.table.col.score'),
      valueGetter: ({ data }) => data?.score ?? null,
      valueFormatter: ({ value }) => (typeof value === 'number' ? points(value) : ''),
      cellRenderer: ScoreCell,
      autoHeight: true,
      initialSort: 'desc',
      width: narrow ? 110 : 200,
    },
    ...textColumns(messages),
    timeColumn(t, narrow),
  ];
}
