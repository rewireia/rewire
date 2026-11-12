import type { LearnerProfile, Region, RoadmapCourse } from '@rewire/contracts';
import { useState } from 'react';

import { useEnrolments } from '../../api/learning-queries.ts';
import { QueryState } from '../../components/QueryState.tsx';
import { OfferAlert } from '../offers/OfferAlert.tsx';
import { toDay } from '../timeline/calendar.ts';
import { DashboardGauges } from './DashboardGauges.tsx';
import { DashboardHeader } from './DashboardHeader.tsx';
import { ForYou } from './ForYou.tsx';
import { learningPath } from './learning-path.ts';
import { LearningPath } from './LearningPath.tsx';
import { MyCourses } from './MyCourses.tsx';
import { RecentActivity } from './RecentActivity.tsx';
import { WalletCard } from './WalletCard.tsx';
import styles from './Overview.module.css';

/**
 * The general panel: greeting and quick actions, the three gauges beside the wallet, the
 * learning path, the courses and the recent activity, and readings for the region.
 */
export function Overview({
  region,
  profile,
  courses,
  planPath,
}: {
  readonly region: Region;
  readonly profile: LearnerProfile | null;
  readonly courses: readonly RoadmapCourse[] | undefined;
  readonly planPath: string;
}) {
  const [today] = useState(() => toDay(new Date()));
  const enrolments = useEnrolments();
  const rows = enrolments.data?.enrolments ?? [];
  const active = rows.find((row) => row.status === 'active');
  return (
    <div className={styles.overview}>
      <DashboardHeader
        profile={profile}
        region={region}
        activeCourseId={active?.courseId ?? null}
      />
      <OfferAlert region={region} />
      <div className={styles.glance}>
        <DashboardGauges region={region} profile={profile} courses={courses} planPath={planPath} />
        <WalletCard region={region} />
      </div>
      {courses !== undefined && (
        <LearningPath
          path={learningPath({ hasOccupation: profile !== null, courses, enrolments: rows, today })}
          profile={profile}
          region={region}
          courses={courses}
          planPath={planPath}
          today={today}
        />
      )}
      <div className={styles.pair}>
        <QueryState query={enrolments}>
          {({ enrolments: list }) => <MyCourses enrolments={list} />}
        </QueryState>
        <RecentActivity region={region} />
      </div>
      <ForYou region={region} />
    </div>
  );
}
