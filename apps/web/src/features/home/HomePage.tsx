import { useCallback, useState } from 'react';
import { useLocation } from 'react-router';
import { useSession } from '../../api/queries.ts';

import { readPreferences, updatePreferences } from '../../app/preferences.ts';
import { Cover } from './Cover.tsx';
import { DemoEntry } from './DemoEntry.tsx';
import { openingPending, openingPlayed } from './intro/once.ts';
import { RegionGate } from './RegionGate.tsx';
import { RoleChoice } from './RoleChoice.tsx';
import { WelcomeHome } from './WelcomeHome.tsx';

type EntryStage = 'region' | 'role' | 'login' | 'home';

/** One photograph throughout region, profile, real demo access and the welcome. */
export function HomePage() {
  const session = useSession();
  const location = useLocation();
  const returning = (location.state as { welcome?: boolean } | null)?.welcome === true;
  const [role, setRole] = useState(readPreferences().journeyRole);
  const [chosenStage, setStage] = useState<EntryStage | null>(null);
  const stage = chosenStage ?? (returning ? 'home' : session.isPending ? null : 'region');
  const [opening, setOpening] = useState(() => !returning && openingPending());
  const done = useCallback(() => {
    openingPlayed();
    setOpening(false);
  }, []);
  return (
    <>
      <Cover opening={opening} regionChosen={stage === 'home'} onOpeningDone={done} />
      {!opening && stage === 'region' && (
        <RegionGate
          onChosen={() => {
            setStage('role');
          }}
        />
      )}
      {!opening && stage === 'role' && (
        <RoleChoice
          onChoose={(chosen) => {
            updatePreferences({ journeyRole: chosen });
            setRole(chosen);
            setStage('login');
          }}
        />
      )}
      {stage === 'login' && (
        <DemoEntry
          role={role}
          onComplete={() => {
            setStage('home');
          }}
        />
      )}
      {!opening && stage === 'home' && <WelcomeHome role={role} />}
    </>
  );
}
