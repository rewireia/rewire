import type { Region } from '@rewire/data/schema';

import type { RegionProfile } from '../schema/region-profile.ts';

import { EU_PROFILE } from './eu.ts';
import { UK_PROFILE } from './uk.ts';
import { US_PROFILE } from './us.ts';

/** The profile of every region Rewire serves, keyed by region. */
export const REGION_PROFILES: Readonly<Record<Region, RegionProfile>> = {
  eu: EU_PROFILE,
  us: US_PROFILE,
  uk: UK_PROFILE,
};
