import { useSession } from '../../api/queries.ts';
import { usePreferences } from '../../app/preferences.ts';
import pageStyles from '../../app/Page.module.css';
import { QueryState } from '../../components/QueryState.tsx';
import { ControlPanel } from './ControlPanel.tsx';
import { SignIn } from './SignIn.tsx';

/** Account control centre: distinct budget, payment, roadmap and calendar views. */
export function DashboardPage() {
  const session = useSession();
  const { region } = usePreferences();
  return (
    <QueryState query={session}>
      {({ authenticated, accessRole, profile }) =>
        authenticated && accessRole === 'learner' ? (
          <ControlPanel region={profile?.region ?? region} profile={profile} />
        ) : (
          <div className={pageStyles.page}>
            <SignIn />
          </div>
        )
      }
    </QueryState>
  );
}
