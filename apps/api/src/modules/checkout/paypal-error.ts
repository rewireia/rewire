import { z } from 'zod';

/** A text field of PayPal's error body; anything else in its place reads as absent. */
const text = z.string().min(1).optional().catch(undefined);

/**
 * The fields of PayPal's error body Rewire uses. PayPal adds others freely, and a body
 * that is not this shape at all still yields an error: just one without these names.
 */
const payPalErrorSchema = z.object({
  name: text,
  debug_id: text,
  details: z
    .array(z.object({ issue: text }).catch({ issue: undefined }))
    .optional()
    .catch(undefined),
});

export interface PayPalErrorFields {
  /** The most specific name PayPal gives: the first detail's issue, or else the error's name. */
  readonly issue: string | undefined;
  /** PayPal's id of the failed call, to quote when asking them about it. */
  readonly debugId: string | undefined;
}

/** Reads the error body of a PayPal answer, whatever it carries. */
export function payPalErrorOf(body: unknown): PayPalErrorFields {
  const parsed = payPalErrorSchema.safeParse(body);
  if (!parsed.success) {
    return { issue: undefined, debugId: undefined };
  }
  const { name, debug_id: debugId, details } = parsed.data;
  return { issue: details?.[0]?.issue ?? name, debugId };
}
