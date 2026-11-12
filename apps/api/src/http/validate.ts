import { regionSchema, type Region } from '@rewire/contracts';
import type { Context } from 'hono';
import type { z } from 'zod';

import type { HttpEnvironment } from './environment.ts';
import { HttpProblem, invalidInput, notFound } from './problem.ts';

/**
 * Parses untrusted input with a schema. Invalid input becomes a 400 problem that names
 * each field at fault.
 */
export function parseInput<Schema extends z.ZodType>(
  schema: Schema,
  input: unknown,
): z.infer<Schema> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    throw invalidInput(
      parsed.error.issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message })),
    );
  }
  return parsed.data;
}

/** Reads the JSON body of a request and parses it with a schema. A body that is not JSON is a 400. */
export async function parseBody<Schema extends z.ZodType>(
  context: Context<HttpEnvironment>,
  schema: Schema,
): Promise<z.infer<Schema>> {
  let body: unknown;
  try {
    body = await context.req.json();
  } catch {
    throw new HttpProblem({
      status: 400,
      code: 'invalid_json',
      title: 'Invalid JSON',
      detail: 'The body of the request is not valid JSON.',
    });
  }
  return parseInput(schema, body);
}

/** The region named in the path. A region that does not exist is a 404, like any missing resource. */
export function regionOf(context: Context<HttpEnvironment>): Region {
  const region = regionSchema.safeParse(context.req.param('region'));
  if (!region.success) {
    throw notFound('That region');
  }
  return region.data;
}
