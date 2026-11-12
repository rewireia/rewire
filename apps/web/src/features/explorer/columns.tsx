import type { ExposureGradient, TaskBand, UnitGroupSummary } from '@rewire/contracts';
import type { ColDef, ICellRendererParams } from 'ag-grid-community';
import { Link } from 'react-router';

import { usePreferences, type Preferences } from '../../app/preferences.ts';
import { shownAs } from '../../components/grid-columns.ts';
import { Probe } from '../../components/Probe.tsx';
import { useMessages, type Messages } from '../../i18n/use-messages.ts';
import { reportPath } from '../occupation/links.ts';

import styles from './ExplorerPage.module.css';

/**
 * The shade of the probe for an occupation's mean score: the darker, the higher the ILO places
 * the occupation. It reuses the band colours; it is not a task band.
 */
const TONE_BY_GRADIENT: Readonly<Record<ExposureGradient, TaskBand>> = {
  'gradient-4': 'high',
  'gradient-3': 'high',
  'gradient-2': 'medium',
  'gradient-1': 'low',
  minimal: 'low',
  'not-exposed': 'very-low',
};

type Cell = ICellRendererParams<UnitGroupSummary>;

/** The report of a group; the person's own occupation keeps its region and job title. */
export function reportOf(isco08: string, { region, occupation }: Preferences): string {
  const chosen = occupation?.isco08 === isco08 ? occupation : undefined;
  return reportPath(chosen?.region ?? region, isco08, chosen);
}

/** The title as a link to the report, so it is announced, opened and copied as one. */
function TitleCell({ data }: Cell) {
  const preferences = usePreferences();
  if (data === undefined) {
    return null;
  }
  return (
    <Link className={styles.title} to={reportOf(data.isco08, preferences)} tabIndex={-1}>
      {data.title}
    </Link>
  );
}

function ExposureCell({ data }: Cell) {
  const { points } = useMessages();
  if (data === undefined) {
    return null;
  }
  return (
    <span className={styles.exposure}>
      <span className={styles.points}>{points(data.meanScore)}</span>
      <Probe score={data.meanScore} band={TONE_BY_GRADIENT[data.gradient]} />
    </span>
  );
}

/** The columns of the explorer; on narrow screens only code, occupation and exposure. */
export function columnsFor({ t, points }: Messages, narrow: boolean): ColDef<UnitGroupSummary>[] {
  return [
    {
      field: 'isco08',
      headerName: t('explore.col.code'),
      width: narrow ? 72 : 92,
      cellClass: 'mono',
    },
    {
      field: 'title',
      headerName: t('explore.col.title'),
      cellRenderer: TitleCell,
      flex: 2,
      minWidth: narrow ? 110 : 160,
    },
    {
      colId: 'majorGroup',
      headerName: t('explore.col.majorGroup'),
      valueGetter: ({ data }) => data?.majorGroup.title,
      flex: 1.2,
      minWidth: 160,
      hide: narrow,
    },
    {
      field: 'meanScore',
      headerName: t('explore.col.exposure'),
      cellRenderer: ExposureCell,
      getQuickFilterText: ({ data }) => points(data.meanScore),
      initialSort: 'desc',
      width: narrow ? 136 : 200,
    },
    {
      field: 'gradient',
      headerName: t('explore.col.level'),
      ...shownAs((data) => (data === undefined ? '' : t(`gradient.${data.gradient}`))),
      width: 150,
      hide: narrow,
    },
    {
      field: 'tasks',
      headerName: t('explore.col.tasks'),
      width: 90,
      cellClass: 'mono',
      hide: narrow,
    },
  ];
}
