import { activeOfferSchema, type ActiveOffer, type Region } from '@rewire/contracts';

import type { Request } from './request.ts';

/** The discount a seller runs in a region, as a learner is told of it. */
export function offersApi(request: Request) {
  return {
    activeOffer(region: Region, signal?: AbortSignal): Promise<ActiveOffer> {
      return request(`/regions/${region}/offer`, activeOfferSchema, { signal: signal ?? null });
    },
  };
}
