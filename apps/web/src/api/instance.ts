import { createApiClient } from './client.ts';

/** The one client the screens share. */
export const api = createApiClient();

/** Lists and reports change only with a new data release: they stay fresh for the visit. */
export const STATIC = { staleTime: Infinity } as const;
