import type { QueryClient } from '@tanstack/react-query';
import type { Session } from '@rewire/contracts';
import { updatePreferences } from '../../app/preferences.ts';

const PRIVATE_KEYS = new Set([
  'session',
  'roadmap',
  'payments',
  'enrolments',
  'sponsorships',
  'wallet',
  'market-catalogue',
  'market-sales',
  'training-courses',
  'study-plan',
  'content',
]);

/** Replace account-bound state after server authentication; retain public evidence caches. */
export async function acceptSession(
  client: QueryClient,
  session: Session,
  role: 'learner' | 'business',
): Promise<void> {
  const filter = {
    predicate: (query: { queryKey: readonly unknown[] }) =>
      PRIVATE_KEYS.has(String(query.queryKey[0])),
  };
  await client.cancelQueries(filter);
  client.removeQueries(filter);
  client.setQueryData(['session'], session);
  updatePreferences({
    journeyRole: role,
    occupation:
      session.profile === null
        ? null
        : {
            region: session.profile.region,
            ...session.profile.occupation,
          },
  });
}
