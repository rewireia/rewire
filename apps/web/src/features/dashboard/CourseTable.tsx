import type { Enrolment } from '@rewire/contracts';
import { useMemo } from 'react';

import { useEnrolments } from '../../api/learning-queries.ts';
import pageStyles from '../../app/Page.module.css';
import { QueryState } from '../../components/QueryState.tsx';
import { useMediaQuery } from '../../components/use-media-query.ts';
import { useMessages } from '../../i18n/use-messages.ts';
import { courseColumns } from './course-columns.tsx';
import styles from './Dashboard.module.css';
import { DashboardGrid } from './DashboardGrid.tsx';

/** "My courses" as a table: each enrolment, its stage, progress, certificate and way back in. */
export function CourseTable() {
  const { t } = useMessages();
  const enrolments = useEnrolments();
  const narrow = useMediaQuery('(max-width: 720px)');
  const columns = useMemo(() => courseColumns(t, narrow), [t, narrow]);
  return (
    <section className={pageStyles.section} aria-labelledby="dashboard-course-table">
      <h2 id="dashboard-course-table">{t('dashboard.courses')}</h2>
      <QueryState query={enrolments}>
        {({ enrolments: rows }) =>
          rows.length === 0 ? (
            <p className={styles.empty}>{t('dashboard.courses.empty')}</p>
          ) : (
            <DashboardGrid<Enrolment, never>
              label={t('dashboard.courses')}
              rows={rows}
              columns={columns}
              quickFilter=""
              getRowId={({ data }) => data.courseId}
            />
          )
        }
      </QueryState>
    </section>
  );
}
