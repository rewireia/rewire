import { regionInsightsSchema, type Region, type RegionInsights } from '@rewire/contracts';

import type { Request } from './request.ts';

/** The data story of a region, worked out by the server from the data bundle. */
export function insightsApi(request: Request) {
  return {
    insights(region: Region, signal?: AbortSignal): Promise<RegionInsights> {
      return request(`/regions/${region}/insights`, regionInsightsSchema, {
        signal: signal ?? null,
      });
    },
  };
}
