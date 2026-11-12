import type { Region, StudyPlan, StudyTimeline } from '@rewire/contracts';
import { lazy, Suspense, useCallback, useMemo, useState } from 'react';

import { useSaveStudyPlan } from '../../api/study-plan-queries.ts';
import { ErrorNotice } from '../../components/ErrorNotice.tsx';
import { LoadingBar } from '../../components/LoadingBar.tsx';
import { Capsule } from '../../components/Capsule.tsx';
import type { PlanView } from '../../app/preferences.ts';
import type { ChartScale } from './gantt-scale.ts';
import { useMessages } from '../../i18n/use-messages.ts';

import { AddToCalendar } from './AddToCalendar.tsx';
import { PlanControls } from './PlanControls.tsx';
import { PlanList } from './PlanList.tsx';
import { PlanSummaryText } from './PlanSummaryText.tsx';
import styles from './Timeline.module.css';
import { usePlanView } from './use-plan-view.ts';

// Bryntum Gantt loads only when the timeline is shown.
const StudyGantt = lazy(async () => ({ default: (await import('./StudyGantt.tsx')).StudyGantt }));

interface PlanInTimeProps {
  readonly region: Region;
  readonly isco08: string;
  /** The reader's own day, which the server measures a waiting payment against. */
  readonly today: string;
  readonly timeline: StudyTimeline;
}

/** Saves every change of the plan; each answer, good or not, draws the plan again. */
function useSavePlan(region: Region, isco08: string, today: string) {
  const save = useSaveStudyPlan(region, isco08, today);
  const [revision, setRevision] = useState(0);
  const { mutate } = save;
  const change = useCallback(
    (plan: StudyPlan) => {
      mutate(plan, {
        onSettled: () => {
          setRevision((current) => current + 1);
        },
      });
    },
    [mutate],
  );
  return { save, revision, change };
}

/** "Timeline | List", offered where the chart has room. */
function ViewSwitch({
  view,
  onChange,
}: {
  readonly view: PlanView;
  readonly onChange: (view: PlanView) => void;
}) {
  const { t } = useMessages();
  return (
    <Capsule
      legend={t('timeline.view')}
      hideLegend
      value={view}
      options={[
        { value: 'timeline', label: t('timeline.view.timeline') },
        { value: 'list', label: t('timeline.view.list') },
      ]}
      onChange={onChange}
    />
  );
}

/** "Saving…" while a change is on its way, and what to do when it failed. */
function SaveState({ busy, error }: { readonly busy: boolean; readonly error: Error | null }) {
  const { t } = useMessages();
  return (
    <>
      <p className={styles.status} role="status">
        {busy ? t('timeline.saving') : ''}
      </p>
      {error !== null && (
        <div className={styles.error}>
          <p>{t('timeline.saveFailed')}</p>
          <ErrorNotice error={error} />
        </div>
      )}
    </>
  );
}

/** "Fit · Weeks · Months": how the time axis is scaled. */
function ScaleSwitch({
  scale,
  onChange,
}: {
  readonly scale: ChartScale;
  readonly onChange: (scale: ChartScale) => void;
}) {
  const { t } = useMessages();
  return (
    <Capsule
      legend={t('timeline.scale')}
      hideLegend
      value={scale}
      options={[
        { value: 'fit', label: t('timeline.scale.fit') },
        { value: 'weeks', label: t('timeline.scale.weeks') },
        { value: 'months', label: t('timeline.scale.months') },
      ]}
      onChange={onChange}
    />
  );
}

interface PlanInTimeOptions {
  /**
   * On the dashboard the figures of the plan are in the head above, so the sentence is left
   * out and every control stands in one bar.
   */
  readonly compact?: boolean;
  /** A course picked on the chart. */
  readonly onSelect?: ((courseId: string) => void) | undefined;
}

/** The controls, the sentence and the plan itself, as a timeline or a list. */
export function PlanInTime({
  region,
  isco08,
  today,
  timeline,
  compact = false,
  onSelect,
}: PlanInTimeProps & PlanInTimeOptions) {
  const { t } = useMessages();
  const { save, revision, change } = useSavePlan(region, isco08, today);
  const { view, offerTimeline, choose } = usePlanView();
  const [scale, setScale] = useState<ChartScale>('fit');
  const snapshot = useMemo(() => ({ timeline, revision }), [timeline, revision]);
  const busy = save.isPending;
  const controls = (
    <PlanControls plan={timeline.plan} busy={busy} revision={revision} onChange={change} />
  );
  return (
    <div className={styles.body}>
      {!compact && controls}
      {!compact && <PlanSummaryText timeline={timeline} />}
      <SaveState busy={busy} error={save.error} />
      <div className={compact ? styles.toolbar : styles.viewBar}>
        {compact && controls}
        {offerTimeline && <ViewSwitch view={view} onChange={choose} />}
        {offerTimeline && view === 'timeline' && <ScaleSwitch scale={scale} onChange={setScale} />}
        <AddToCalendar timeline={timeline} />
      </div>
      {view === 'timeline' ? (
        <div className={styles.chart}>
          <p className={styles.detail}>{t('timeline.chartHint')}</p>
          <Suspense fallback={<LoadingBar />}>
            <StudyGantt
              region={region}
              snapshot={snapshot}
              busy={busy}
              onChange={change}
              scale={scale}
              onSelect={onSelect}
            />
          </Suspense>
        </div>
      ) : (
        <PlanList
          key={revision}
          region={region}
          timeline={timeline}
          busy={busy}
          onChange={change}
        />
      )}
    </div>
  );
}
