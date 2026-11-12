import type { LearnerProfile, Region, RoadmapCourse } from '@rewire/contracts';
import type { UseQueryResult } from '@tanstack/react-query';
import { lazy, Suspense, useState } from 'react';

import { ButtonLink } from '../../components/Button.tsx';
import { useMessages } from '../../i18n/use-messages.ts';
import { toDay } from '../timeline/calendar.ts';
import { CourseTable } from './CourseTable.tsx';
import { dashboardCopy } from './dashboard-copy.ts';
import { RoadmapSummary } from './RoadmapSummary.tsx';
import tabStyles from './RoadmapTab.module.css';
import styles from './ControlPanel.module.css';

/** The path, with its chart, is loaded only when this tab is opened. */
const RoadmapPath = lazy(async () => ({
  default: (await import('./RoadmapPath.tsx')).RoadmapPath,
}));

/**
 * "My roadmap", a path of modules to put in and take out: its figures, the chart to move them
 * in time, the card of the module picked with its actions, the courses to add, and "My courses".
 */
export function RoadmapTab({
  region,
  profile,
  roadmap,
}: {
  readonly region: Region;
  readonly profile: LearnerProfile | null;
  readonly roadmap: UseQueryResult<{ courses: RoadmapCourse[] }>;
}) {
  const { language } = useMessages();
  const copy = dashboardCopy[language];
  // The plan in time is read for the reader's own day, as the chart reads it.
  const [today] = useState(() => toDay(new Date()));
  if (profile === null) {
    return (
      <div className={styles.empty}>
        <h3>{copy.roadmapEmpty}</h3>
        <p>{copy.roadmapEmptyBody}</p>
        <ButtonLink primary to="/start">
          {copy.reportTodo}
        </ButtonLink>
      </div>
    );
  }
  const isco08 = profile.occupation.isco08;
  return (
    <>
      <RoadmapSummary region={region} isco08={isco08} today={today}>
        <ButtonLink primary to="/courses">
          {copy.addCourses}
        </ButtonLink>
      </RoadmapSummary>
      <Suspense
        fallback={
          <div className={tabStyles.skeleton}>
            <p>{copy.loadingPlan}</p>
          </div>
        }
      >
        <RoadmapPath
          region={region}
          isco08={isco08}
          today={today}
          roadmap={roadmap.data?.courses ?? []}
        />
      </Suspense>
      <CourseTable />
    </>
  );
}
