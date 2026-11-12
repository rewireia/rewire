import { discountBeaconSchema, type DiscountBeacon, type Region } from '@rewire/contracts';
import { expect, type APIRequestContext } from '@playwright/test';

interface BeaconRequest {
  readonly region: Region;
  readonly percent: number;
  /** How long it runs from now. */
  readonly minutes: number;
}

/**
 * Starts a discount beacon of the demo seller now, through the business API, as the seller does
 * from its panel. It signs in as the business in its own request context, so a page signed in as
 * the learner keeps its session.
 */
export async function startBeacon(
  request: APIRequestContext,
  { region, percent, minutes }: BeaconRequest,
): Promise<DiscountBeacon> {
  const signedIn = await request.post('/api/session/sign-in', {
    data: { username: 'Rewire', password: 'DemoDemoDemo', role: 'business' },
  });
  expect(signedIn.ok()).toBe(true);
  const now = Date.now();
  const created = await request.post('/api/business/beacons', {
    data: {
      region,
      percent,
      startsAt: new Date(now).toISOString(),
      endsAt: new Date(now + minutes * 60_000).toISOString(),
    },
  });
  expect(created.status()).toBe(201);
  return discountBeaconSchema.parse(await created.json());
}
