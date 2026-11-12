import { z } from 'zod';

import { moneySchema, regionSchema } from './region.ts';

/** The longest a discount beacon may run: a week. */
export const BEACON_MAXIMUM_HOURS = 168;

/**
 * A discount beacon: the seller takes a percentage off every published course of a region
 * between two instants. The server applies it to every price it quotes while it runs.
 */
export const discountBeaconInputSchema = z
  .object({
    region: regionSchema,
    percent: z.number().int().min(5).max(90),
    startsAt: z.iso.datetime(),
    endsAt: z.iso.datetime(),
  })
  .refine((beacon) => Date.parse(beacon.startsAt) < Date.parse(beacon.endsAt), {
    message: 'The beacon must end after it starts',
  })
  .refine(
    (beacon) =>
      Date.parse(beacon.endsAt) - Date.parse(beacon.startsAt) <= BEACON_MAXIMUM_HOURS * 3_600_000,
    { message: 'A beacon runs for a week at most' },
  );

export type DiscountBeaconInput = z.infer<typeof discountBeaconInputSchema>;

/** Where a beacon stands at the moment it is read. */
export const discountBeaconStatusSchema = z.enum(['scheduled', 'active', 'ended', 'cancelled']);

export type DiscountBeaconStatus = z.infer<typeof discountBeaconStatusSchema>;

export const discountBeaconSchema = z.object({
  id: z.string(),
  region: regionSchema,
  percent: z.number().int(),
  startsAt: z.iso.datetime(),
  endsAt: z.iso.datetime(),
  status: discountBeaconStatusSchema,
  createdAt: z.iso.datetime(),
});

export type DiscountBeacon = z.infer<typeof discountBeaconSchema>;

export const discountBeaconListSchema = z.object({ beacons: z.array(discountBeaconSchema) });

export type DiscountBeaconList = z.infer<typeof discountBeaconListSchema>;

/** The discount on a course while a beacon runs: what it costs without it, and until when. */
export const catalogueOfferSchema = z.object({
  percent: z.number().int(),
  listPrice: moneySchema,
  endsAt: z.iso.datetime(),
});

export type CatalogueOffer = z.infer<typeof catalogueOfferSchema>;

/** What a learner is told while a beacon runs in their region; `offer` is null when none does. */
export const activeOfferSchema = z.object({
  offer: z
    .object({
      region: regionSchema,
      percent: z.number().int(),
      endsAt: z.iso.datetime(),
      /** Published courses the discount applies to. */
      courses: z.number().int().nonnegative(),
    })
    .nullable(),
});

export type ActiveOffer = z.infer<typeof activeOfferSchema>;
