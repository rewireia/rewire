import type { PlannedCourse, Region, RoadmapCourse } from '@rewire/contracts';
import { useState } from 'react';

import { useStudyTimeline } from '../../api/study-plan-queries.ts';
import { QueryState } from '../../components/QueryState.tsx';
import { useMessages } from '../../i18n/use-messages.ts';
import { GuideSuggestions } from '../timeline/GuideSuggestions.tsx';
import { PlanInTime } from '../timeline/PlanInTime.tsx';
import { AddModule } from './AddModule.tsx';
import { dashboardCopy } from './dashboard-copy.ts';
import { ModuleSheet } from './ModuleSheet.tsx';
import { modulesOf } from './path-modules.ts';
import styles from './RoadmapPath.module.css';

/**
 * The path as one list of modules: Tempo, the plan agent, to change it in words, the chart (or
 * the list on a phone), the modules to pick one, its card with its actions, and the courses that
 * can be added.
 */
export function RoadmapPath({
  region,
  isco08,
  today,
  roadmap,
}: {
  readonly region: Region;
  readonly isco08: string;
  readonly today: string;
  readonly roadmap: readonly RoadmapCourse[];
}) {
  const timeline = useStudyTimeline(region, isco08, today);
  const [picked, setPicked] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  return (
    <QueryState query={timeline}>
      {(data) => {
        const modules = modulesOf(data);
        const shown = modules.find(({ id }) => id === picked) ?? modules.find(isNext) ?? modules[0];
        return (
          <div className={styles.path}>
            <GuideSuggestions />
            <PlanInTime
              compact
              region={region}
              isco08={isco08}
              today={today}
              timeline={data}
              onSelect={setPicked}
            />
            <ModulePicker
              modules={modules}
              shown={shown?.id}
              adding={adding}
              onPick={setPicked}
              onAdding={setAdding}
            />
            <div className={styles.below}>
              {shown !== undefined && (
                <ModuleSheet
                  key={shown.id}
                  course={shown}
                  timeline={data}
                  roadmap={roadmap}
                  region={region}
                  today={today}
                />
              )}
              {adding && <AddModule region={region} timeline={data} roadmap={roadmap} />}
            </div>
          </div>
        );
      }}
    </QueryState>
  );
}

/** The modules as pills, to pick one on any screen, and "Add a module". */
function ModulePicker({
  modules,
  shown,
  adding,
  onPick,
  onAdding,
}: {
  readonly modules: readonly PlannedCourse[];
  readonly shown: string | undefined;
  readonly adding: boolean;
  readonly onPick: (id: string) => void;
  readonly onAdding: (adding: boolean) => void;
}) {
  const { language } = useMessages();
  const copy = dashboardCopy[language];
  return (
    <div className={styles.modules} role="group" aria-label={copy.modules}>
      {modules.map((module) => (
        <button
          key={module.id}
          type="button"
          className={styles.chip}
          data-stage={module.stage}
          data-out={module.booking === null || undefined}
          aria-pressed={module.id === shown}
          onClick={() => {
            onPick(module.id);
          }}
        >
          <span className={styles.chipDot} aria-hidden="true" />
          {module.title}
        </button>
      ))}
      <button
        type="button"
        className={styles.addChip}
        aria-expanded={adding}
        onClick={() => {
          onAdding(!adding);
        }}
      >
        + {copy.addModule}
      </button>
    </div>
  );
}

/** The module to look at first: the first one not yet paid for or not yet done. */
function isNext(module: PlannedCourse): boolean {
  return module.booking !== null && module.kind === 'paid' && module.enrolment !== 'completed';
}
