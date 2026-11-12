import type { UnitGroupSummary } from '@rewire/contracts';
import type { AgGridReact } from 'ag-grid-react';
import { useMemo, useRef, useState } from 'react';

import pageStyles from '../../app/Page.module.css';
import { usePreferences } from '../../app/preferences.ts';
import { Button } from '../../components/Button.tsx';
import { useMessages } from '../../i18n/use-messages.ts';

import styles from './ExplorerPage.module.css';
import { Histogram } from './Histogram.tsx';
import { MajorGroupFilter, majorGroupsOf } from './MajorGroupFilter.tsx';
import { OccupationGrid } from './OccupationGrid.tsx';

/** The table of occupations, its text and major group filters, and the person's own row. */
export function ExplorerView({ unitGroups }: { readonly unitGroups: readonly UnitGroupSummary[] }) {
  const { t, language } = useMessages();
  const { occupation } = usePreferences();
  const grid = useRef<AgGridReact<UnitGroupSummary>>(null);
  const [text, setText] = useState('');
  const [hidden, setHidden] = useState<ReadonlySet<string>>(new Set());
  // What the table shows after both filters, as AG Grid counts it.
  const [shown, setShown] = useState(unitGroups.length);

  const majorGroups = useMemo(() => majorGroupsOf(unitGroups), [unitGroups]);
  const rows = useMemo(
    () => unitGroups.filter((group) => !hidden.has(group.majorGroup.code)),
    [unitGroups, hidden],
  );
  const mine = occupation?.isco08;
  const numbers = new Intl.NumberFormat(language);

  const goToMine = () => {
    const node = mine === undefined ? undefined : grid.current?.api.getRowNode(mine);
    if (node?.rowIndex === null || node?.rowIndex === undefined) {
      return;
    }
    grid.current?.api.ensureNodeVisible(node, 'middle');
    grid.current?.api.setFocusedCell(node.rowIndex, 'title');
  };

  return (
    <section className={styles.view} aria-label={t('explore.title')}>
      <div className={styles.tools}>
        <label className={styles.filter}>
          <span className={pageStyles.eyebrow}>{t('explore.filter')}</span>
          <input
            type="search"
            value={text}
            onChange={(event) => {
              setText(event.target.value);
            }}
          />
        </label>
        {mine !== undefined && <Button onClick={goToMine}>{t('explore.mine')}</Button>}
      </div>
      <Histogram unitGroups={unitGroups} mine={mine} />
      <MajorGroupFilter groups={majorGroups} hidden={hidden} onChange={setHidden} />
      <p className={styles.count} aria-live="polite">
        {t('explore.count', {
          shown: numbers.format(shown),
          total: numbers.format(unitGroups.length),
        })}
      </p>
      <OccupationGrid gridRef={grid} rows={rows} text={text} mine={mine} onShownChange={setShown} />
    </section>
  );
}
