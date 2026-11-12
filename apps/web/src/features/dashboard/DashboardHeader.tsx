import type { LearnerProfile, Region } from '@rewire/contracts';
import { Link } from 'react-router';

import { Icon } from '../../components/Icon.tsx';
import { useMessages } from '../../i18n/use-messages.ts';
import { dashboardCopy } from './dashboard-copy.ts';
import { SignOut } from './SignIn.tsx';
import styles from './Overview.module.css';

/**
 * The navy head of the overview: a greeting with the learner's occupation and region, and the
 * three quick actions. "Continue learning" appears only with a course under way.
 */
export function DashboardHeader({
  profile,
  region,
  activeCourseId,
}: {
  readonly profile: LearnerProfile | null;
  readonly region: Region;
  readonly activeCourseId: string | null;
}) {
  const { language, t } = useMessages();
  const copy = dashboardCopy[language];
  return (
    <header className={styles.hero}>
      <div className={styles.heroText}>
        <p className={styles.heroEyebrow}>REWIRE / {copy.tabs[0]}</p>
        <h1>{profile ? copy.greeting : copy.greetingNew}</h1>
        {profile ? (
          <p className={styles.heroWho}>
            <span>{profile.occupation.title}</span>
            <span className={styles.heroCode}>{profile.occupation.code}</span>
            <span className={styles.heroRegion}>{t(`region.${profile.region}`)}</span>
          </p>
        ) : (
          <p className={styles.heroWho}>
            <span>{copy.greetingLead}</span>
            <span className={styles.heroRegion}>{t(`region.${region}`)}</span>
          </p>
        )}
      </div>
      <div className={styles.heroSide}>
        <SignOut />
        <nav className={styles.quick} aria-label={copy.quickActions}>
          <QuickLink to="?tab=wallet" primary>
            {copy.addFunds}
          </QuickLink>
          <QuickLink to="/courses">{copy.findCourses}</QuickLink>
          {activeCourseId !== null && (
            <QuickLink to={`/learn/${activeCourseId}`}>{copy.keepLearning}</QuickLink>
          )}
        </nav>
      </div>
    </header>
  );
}

function QuickLink({
  to,
  primary = false,
  children,
}: {
  readonly to: string;
  readonly primary?: boolean;
  readonly children: string;
}) {
  return (
    <Link to={to} className={styles.quickLink} data-primary={primary || undefined}>
      {children}
      <span className={styles.quickArrow}>
        <Icon name="arrow" size={18} />
      </span>
    </Link>
  );
}
