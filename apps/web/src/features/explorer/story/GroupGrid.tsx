import type { MajorGroupInsight } from '@rewire/contracts';
import {
  CellStyleModule,
  ClientSideRowModelModule,
  LocaleModule,
  RowAutoHeightModule,
  type Module,
} from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { useMemo } from 'react';

import { useGridText } from '../../../components/grid-locale.ts';
import { NARROW_SCREEN, useMediaQuery } from '../../../components/use-media-query.ts';
import { useMessages } from '../../../i18n/use-messages.ts';
import { gridTheme } from '../../../theme/grid-theme.ts';

import { groupColumns, type GroupRow } from './group-columns.tsx';
import { majorGroupName } from './major-groups.ts';
import styles from './Story.module.css';
import { useStoryFormat } from './use-story-format.ts';

/** Only what this table needs: rows on the client, rows as tall as their text, its own texts. */
const MODULES: Module[] = [
  ClientSideRowModelModule,
  RowAutoHeightModule,
  CellStyleModule,
  LocaleModule,
];

/** The nine major groups, their exposure and their share of the region's employment. */
export function GroupGrid({ groups }: { readonly groups: readonly MajorGroupInsight[] }) {
  const messages = useMessages();
  const { t } = messages;
  const format = useStoryFormat();
  const narrow = useMediaQuery(NARROW_SCREEN);
  const getLocaleText = useGridText('explore.none');
  const columns = useMemo(() => groupColumns(messages, narrow), [messages, narrow]);
  const rows = useMemo<GroupRow[]>(() => {
    const largest = Math.max(...groups.map((group) => group.employedShare ?? 0), 0);
    return groups.map((group) => ({
      code: group.code,
      name: majorGroupName(t, group),
      meanScore: group.meanScore,
      employedShare: group.employedShare,
      shareBar: largest === 0 ? 0 : (group.employedShare ?? 0) / largest,
      shareText:
        group.employedShare === null
          ? t('insights.grid.notPublished')
          : format.percent(group.employedShare),
    }));
  }, [groups, t, format]);
  return (
    <div className={styles.grid} role="region" aria-label={t('insights.grid.label')}>
      <AgGridReact<GroupRow>
        modules={MODULES}
        theme={gridTheme}
        rowData={rows}
        columnDefs={columns}
        getRowId={({ data }) => data.code}
        getLocaleText={getLocaleText}
        domLayout="autoHeight"
        suppressCellFocus
        enableCellTextSelection
      />
    </div>
  );
}
