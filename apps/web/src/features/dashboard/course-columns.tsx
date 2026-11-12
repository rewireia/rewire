import type { Enrolment } from '@rewire/contracts';
import type { ColDef, ICellRendererParams } from 'ag-grid-community';
import { Link } from 'react-router';

import { shownAs } from '../../components/grid-columns.ts';
import { useMessages, type Messages } from '../../i18n/use-messages.ts';

import styles from './Dashboard.module.css';

type Cell = ICellRendererParams<Enrolment>;

/** "2 of 5": the lessons done, as the progress cell writes them. */
function lessonsDone(t: Messages['t'], data: Enrolment | undefined): string {
  return data?.kind !== 'hosted'
    ? ''
    : t('dashboard.progressLabel', { done: data.lessonsCompleted, total: data.lessons });
}

function ProgressCell({ data }: Cell) {
  const { t } = useMessages();
  if (data?.kind !== 'hosted') {
    return null;
  }
  const share = data.lessons === 0 ? 0 : data.lessonsCompleted / data.lessons;
  return (
    <span className={styles.progress}>
      <span className={styles.bar} aria-hidden="true">
        <span style={{ width: `${share * 100}%` }} />
      </span>
      <span className="mono">{lessonsDone(t, data)}</span>
    </span>
  );
}

function CourseAction({ data }: Cell) {
  const { t } = useMessages();
  if (data === undefined) {
    return null;
  }
  if (data.kind === 'listed') {
    return (
      <a className={styles.action} href={data.url} target="_blank" rel="noopener noreferrer">
        {t('action.continue')}
      </a>
    );
  }
  return data.certificateId === null ? (
    <Link className={styles.action} to={`/learn/${data.courseId}`}>
      {t('action.continue')}
    </Link>
  ) : (
    <Link className={styles.action} to={`/certificates/${data.certificateId}`}>
      {t('action.viewCertificate')}
    </Link>
  );
}

/** The columns of "My courses"; on narrow screens only course, progress and action. */
export function courseColumns(t: Messages['t'], narrow: boolean): ColDef<Enrolment>[] {
  return [
    {
      field: 'title',
      headerName: t('col.course'),
      flex: 2,
      minWidth: narrow ? 110 : 160,
      wrapText: true,
      autoHeight: true,
    },
    {
      field: 'stage',
      headerName: t('col.stage'),
      ...shownAs((data) => (data?.kind === 'hosted' ? t(`stage.${data.stage}`) : '')),
      width: 130,
      hide: narrow,
    },
    {
      colId: 'progress',
      headerName: t('col.progress'),
      valueGetter: ({ data }) =>
        data?.kind === 'hosted' ? data.lessonsCompleted / Math.max(data.lessons, 1) : 0,
      cellRenderer: ProgressCell,
      getQuickFilterText: ({ data }) => lessonsDone(t, data),
      width: narrow ? 92 : 190,
    },
    {
      field: 'status',
      headerName: t('col.status'),
      ...shownAs((data) => (data === undefined ? '' : t(`learn.status.${data.status}`))),
      width: 130,
      hide: narrow,
    },
    {
      colId: 'certificate',
      headerName: t('col.certificate'),
      valueGetter: ({ data }) => data?.certificateId ?? '—',
      cellClass: 'mono',
      width: 150,
      hide: narrow,
    },
    {
      colId: 'action',
      headerName: t('col.action'),
      cellRenderer: CourseAction,
      sortable: false,
      width: narrow ? 104 : 170,
    },
  ];
}
