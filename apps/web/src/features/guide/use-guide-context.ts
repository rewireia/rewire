import { unitGroupCodeSchema } from '@rewire/contracts';
import { useMatches } from 'react-router';

import { useSession } from '../../api/queries.ts';
import { usePreferences } from '../../app/preferences.ts';

/** What the guide is told with every message: the region and the occupation in view. */
export function useGuideContext() {
  const { region } = usePreferences();
  const matches = useMatches();
  const session = useSession();
  const inView = unitGroupCodeSchema.safeParse(matches.at(-1)?.params.isco08);
  const isco08 = inView.success ? inView.data : session.data?.profile?.occupation.isco08;
  return { region, isco08 };
}
