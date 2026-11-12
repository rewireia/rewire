import { z } from 'zod';

const CODE_DIGITS = 4;

/**
 * A four-digit code read from a spreadsheet cell, which may hold it as text or as a number.
 * A number has lost its leading zeros, so they are restored: 110 is read as "0110". Text is
 * kept as written, so a cell may still carry a marker that is not a code.
 */
export const codeCellSchema = z
  .union([z.string(), z.number().int().nonnegative()])
  .transform((cell) => (typeof cell === 'number' ? String(cell).padStart(CODE_DIGITS, '0') : cell));
