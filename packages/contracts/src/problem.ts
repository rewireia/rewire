import { z } from 'zod';

/**
 * The body of every error answer, after RFC 9457 "Problem Details for HTTP APIs".
 * `code` is stable and meant for programs; `detail` is written for people.
 */
export const problemSchema = z.object({
  status: z.number().int(),
  code: z.string(),
  title: z.string(),
  detail: z.string().optional(),
  /** Id of the request, to find it in the server log. */
  requestId: z.string().optional(),
  /** For invalid input: what is wrong with each field. */
  issues: z.array(z.object({ path: z.string(), message: z.string() })).optional(),
});

export type Problem = z.infer<typeof problemSchema>;
