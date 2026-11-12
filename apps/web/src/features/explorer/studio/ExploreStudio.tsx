import type { UnitGroupSummary } from '@rewire/contracts';
import { AgStudioLicenseManager, type AgGetContextMenuParams } from 'ag-studio';
import { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router';

import { useGuideAvailable } from '../../../api/guide-queries.ts';
import { usePreferences } from '../../../app/preferences.ts';
import { Button } from '../../../components/Button.tsx';
import { useMessages } from '../../../i18n/use-messages.ts';
import { GuidePrivacy } from '../../guide/GuidePrivacy.tsx';
import { reportOf } from '../columns.tsx';

import { describeFilter, occupationOf } from './context-menu.ts';
import { Dashboard } from './Dashboard.tsx';
import styles from './Studio.module.css';
import { studioDataOf } from './studio-data.ts';
import { StudioTools, type StudioMode } from './StudioTools.tsx';
import { useSavedReport } from './use-saved-report.ts';
import { useStudioControls } from './use-studio-controls.ts';

/**
 * A licence key of AG Grid Ltd, read from the root `.env` at build time. Without one, AG Studio
 * runs as its trial: its own notice in the console, and its watermark off this machine.
 */
const LICENCE_KEY: unknown = import.meta.env.VITE_AG_STUDIO_LICENCE_KEY;
if (typeof LICENCE_KEY === 'string' && LICENCE_KEY !== '') {
  AgStudioLicenseManager.setLicenseKey(LICENCE_KEY);
}

interface ExploreStudioProps {
  readonly unitGroups: readonly UnitGroupSummary[];
}

/** The right-click menu of a row or a bar: its occupation's report, and a drill-through. */
function useContextMenu(controls: ReturnType<typeof useStudioControls>) {
  const { t } = useMessages();
  const preferences = usePreferences();
  const navigate = useNavigate();
  return ({ filter }: AgGetContextMenuParams) => {
    const isco08 = occupationOf(filter);
    return [
      ...(isco08 === undefined
        ? []
        : [
            {
              name: t('studio.menu.report'),
              action: () => void navigate(reportOf(isco08, preferences)),
            },
          ]),
      ...(filter === undefined
        ? []
        : [
            {
              name: t('studio.menu.drill'),
              action: () => {
                controls.drillTo(filter);
              },
            },
          ]),
    ];
  };
}

/**
 * The explorer's "Analyse" view: the ILO index as an AG Studio dashboard of two pages, read by
 * default, designed on request and, where the server has a model, explained and changed by
 * Rewire's analyst. The layout is kept in this browser only; "Reset" goes back to the shipped one.
 */
export function ExploreStudio({ unitGroups }: ExploreStudioProps) {
  const messages = useMessages();
  const { t, language } = messages;
  const analystOffered = useGuideAvailable();
  const [mode, setMode] = useState<StudioMode>('read');
  const box = useRef<HTMLDivElement>(null);
  const changeMode = (next: StudioMode) => {
    setMode(next);
    if (next === 'analyst') {
      // The conversation fills the window: bring the whole of it into view.
      box.current?.scrollIntoView({ block: 'start' });
    }
  };
  const controls = useStudioControls();
  const saved = useSavedReport();
  const contextMenu = useContextMenu(controls);
  const data = useMemo(() => studioDataOf(unitGroups, { t, language }), [unitGroups, t, language]);
  return (
    <section className={styles.view} aria-label={t('studio.label')}>
      <p className={styles.lede}>{t('studio.lede')}</p>
      <StudioTools
        mode={mode}
        onMode={changeMode}
        analystOffered={analystOffered}
        controls={controls}
        onReset={saved.reset}
      />
      {controls.drill !== null && (
        <p className={styles.drill}>
          {t('studio.drill.showing', { what: describeFilter(controls.drill) })}
          <Button onClick={controls.clearDrill}>{t('studio.drill.clear')}</Button>
        </p>
      )}
      {mode === 'analyst' && <GuidePrivacy className={styles.privacy} />}
      <p className={styles.status} role="status">
        {saved.status === 'idle' ? '' : t(`studio.status.${saved.status}`)}
      </p>
      <div ref={box} className={styles.studio}>
        <Dashboard
          key={`${saved.studioKey}-${String(analystOffered)}`}
          messages={messages}
          openReport={saved.openReport}
          data={data}
          mode={mode}
          analystOffered={analystOffered}
          drill={controls.drill}
          contextMenu={contextMenu}
          onOpen={controls.follow}
          onState={(api) => {
            saved.keep(api);
            controls.follow(api);
          }}
        />
      </div>
    </section>
  );
}
