import { z } from 'zod';

/**
 * An ISCO-08 unit group: the four-digit international code that every regional
 * classification is bridged to, and the level at which the ILO scores exposure.
 */
export const iscoUnitGroupCodeSchema = z.string().regex(/^\d{4}$/, 'expected four digits');

export type IscoUnitGroupCode = z.infer<typeof iscoUnitGroupCodeSchema>;
