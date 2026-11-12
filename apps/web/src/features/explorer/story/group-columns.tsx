import type { ColDef, ICellRendererParams } from 'ag-grid-community';

import type { Messages } from '../../../i18n/use-messages.ts';

import { bandOfScore } from './story.ts';
import styles from './Story.module.css';

/** One major group as a row: its names, its mean score and its share of employment. */
export interface GroupRow {
  readonly code: string;
  readonly name: string;
  readonly meanScore: number;
  readonly employedShare: number | null;
  /** The share against the largest share of the table, for the length of its bar. */
  readonly shareBar: number;
  /** The share as a percentage in the person's language, or the words for "not told apart". */
  readonly shareText: string;
}

type Cell = ICellRendererParams<GroupRow>;

function GroupCell({ data }: Cell) {
  if (data === undefined) {
    return null;
  }
  return (
    <span className={styles.groupCell}>
      <span className={styles.code}>{data.code}</span>
      <span>{data.name}</span>
    </span>
  );
}

/** A figure above a bar, the bar in the band's colour or in the accent. */
function Bar({
  text,
  fraction,
  band,
  label,
}: {
  readonly text: string;
  readonly fraction: number;
  readonly band?: string;
  readonly label: string;
}) {
  return (
    <span className={styles.barCell}>
      <span className={styles.barFigure}>{text}</span>
      <span className={styles.track} data-band={band} role="img" aria-label={`${label}: ${text}`}>
        <span className={styles.fill} style={{ width: `${Math.round(fraction * 1000) / 10}%` }} />
      </span>
    </span>
  );
}

/** Three columns, each with its visual bar where it holds a figure. */
export function groupColumns({ t, points }: Messages, narrow: boolean): ColDef<GroupRow>[] {
  return [
    {
      colId: 'group',
      headerName: t('insights.grid.col.group'),
      field: 'name',
      cellRenderer: GroupCell,
      flex: 1,
      minWidth: narrow ? 120 : 280,
      wrapText: true,
      autoHeight: true,
    },
    {
      colId: 'exposure',
      headerName: t(narrow ? 'insights.grid.col.score' : 'insights.grid.col.exposure'),
      wrapHeaderText: true,
      autoHeaderHeight: true,
      field: 'meanScore',
      initialSort: 'desc',
      cellRenderer: ({ data }: Cell) =>
        data === undefined ? null : (
          <Bar
            text={
              narrow
                ? points(data.meanScore)
                : `${points(data.meanScore)} · ${t(`band.${bandOfScore(data.meanScore)}`)}`
            }
            fraction={data.meanScore}
            band={bandOfScore(data.meanScore)}
            label={t('insights.grid.col.exposure')}
          />
        ),
      width: narrow ? 98 : 220,
    },
    {
      colId: 'employed',
      headerName: t(narrow ? 'insights.grid.col.share' : 'insights.grid.col.employed'),
      wrapHeaderText: true,
      autoHeaderHeight: true,
      field: 'employedShare',
      cellRenderer: ({ data }: Cell) =>
        data === undefined ? null : data.employedShare === null ? (
          <span className={styles.muted}>{data.shareText}</span>
        ) : (
          <Bar
            text={data.shareText}
            fraction={data.shareBar}
            label={t('insights.grid.col.employed')}
          />
        ),
      width: narrow ? 80 : 220,
    },
  ];
}
