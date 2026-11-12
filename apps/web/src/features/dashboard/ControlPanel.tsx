import type { LearnerProfile, Region, RoadmapCourse } from '@rewire/contracts';
import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router';
import { api } from '../../api/instance.ts';
import { QueryState } from '../../components/QueryState.tsx';
import { useMessages } from '../../i18n/use-messages.ts';
import { WalletPanel } from '../marketplace/WalletPanel.tsx';
import { Overview } from './Overview.tsx';
import { SignOut } from './SignIn.tsx';
import { dashboardCopy, dashboardTabs, type DashboardTab } from './dashboard-copy.ts';
import { RoadmapTab } from './RoadmapTab.tsx';
import { LearningCalendar } from './LearningCalendar.tsx';
import { PaymentsTab } from './PaymentsTab.tsx';
import styles from './ControlPanel.module.css';

/** The tab asked for in the address; the old "budget" opens the wallet that replaced it. */
function tabOf(value: string | null): DashboardTab {
  const asked = value === 'budget' ? 'wallet' : value;
  return dashboardTabs.find((tab) => tab === asked) ?? 'overview';
}

export function ControlPanel({
  region,
  profile,
}: {
  readonly region: Region;
  readonly profile: LearnerProfile | null;
}) {
  const { language } = useMessages();
  const copy = dashboardCopy[language];
  const [params] = useSearchParams();
  const tab = tabOf(params.get('tab'));
  const roadmap = useQuery({
    queryKey: ['roadmap', region, language],
    queryFn: ({ signal }) => api.roadmap(region, language, signal),
  });
  const start = profile ? `/${region}/plan/${profile.occupation.isco08}` : '/start';
  return (
    <div className={styles.panel}>
      <nav className={styles.navigation} aria-label={copy.title}>
        {dashboardTabs.map((value, index) => (
          <Link key={value} to={`?tab=${value}`} aria-current={value === tab ? 'page' : undefined}>
            {copy.tabs[index]}
          </Link>
        ))}
      </nav>
      <div className={styles.content}>
        {tab === 'overview' ? (
          <Overview
            region={region}
            profile={profile}
            courses={roadmap.data?.courses}
            planPath={start}
          />
        ) : (
          <header className={styles.header}>
            <div>
              <p className={styles.eyebrow}>REWIRE / {copy.tabs[dashboardTabs.indexOf(tab)]}</p>
              <h1>{copy.title}</h1>
              <p>{copy.subtitle}</p>
            </div>
            <SignOut />
          </header>
        )}
        <TabBody tab={tab} region={region} profile={profile} roadmap={roadmap} />
      </div>
    </div>
  );
}
/** The detail tabs: wallet, payments, refunds, roadmap and calendar. */
function TabBody({
  tab,
  region,
  profile,
  roadmap,
}: {
  readonly tab: DashboardTab;
  readonly region: Region;
  readonly profile: LearnerProfile | null;
  readonly roadmap: UseQueryResult<{ courses: RoadmapCourse[] }>;
}) {
  return (
    <>
      {tab === 'wallet' && <WalletPanel region={region} />}
      {tab === 'payments' && <PaymentsTab region={region} />}
      {tab === 'refunds' && <PaymentsTab region={region} refundsOnly />}
      {tab === 'roadmap' && <RoadmapTab region={region} profile={profile} roadmap={roadmap} />}
      {tab === 'calendar' && (
        <QueryState query={roadmap}>
          {({ courses }) => <LearningCalendar courses={courses} region={region} />}
        </QueryState>
      )}
    </>
  );
}
