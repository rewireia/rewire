import type { Context } from 'hono';
import { deleteCookie, getSignedCookie, setSignedCookie } from 'hono/cookie';
import { z } from 'zod';

import type { HttpEnvironment } from '../../http/environment.ts';
import { HttpProblem } from '../../http/problem.ts';

import type { SessionOptions } from './session.ts';

const COOKIE = 'rewire_access';
const DURATION_SECONDS = 8 * 60 * 60;
const accessSchema = z.object({
  learnerId: z.string(),
  expiresAt: z.number().int(),
  role: z.enum(['learner', 'business']),
});

/** A short-lived signed grant, bound to the learner identity selected for this browser. */
export async function hasDashboardAccess(context: Context<HttpEnvironment>, secret: string) {
  const signed = await getSignedCookie(context, secret, COOKIE);
  if (typeof signed !== 'string') return null;
  try {
    const value: unknown = JSON.parse(signed);
    const grant = accessSchema.safeParse(value);
    return grant.success &&
      grant.data.learnerId === context.get('learnerId') &&
      grant.data.expiresAt > Date.now()
      ? grant.data.role
      : null;
  } catch {
    return null;
  }
}

export async function grantDashboardAccess(
  context: Context<HttpEnvironment>,
  learnerId: string,
  options: SessionOptions,
  role: 'learner' | 'business',
) {
  const grant = { learnerId, role, expiresAt: Date.now() + DURATION_SECONDS * 1000 };
  await setSignedCookie(context, COOKIE, JSON.stringify(grant), options.secret, {
    httpOnly: true,
    sameSite: 'Lax',
    secure: options.secure,
    path: '/',
    maxAge: DURATION_SECONDS,
  });
  context.set('authenticated', true);
  context.set('accessRole', role);
}

export function clearDashboardAccess(context: Context<HttpEnvironment>) {
  deleteCookie(context, COOKIE, { path: '/' });
  context.set('authenticated', false);
  context.set('accessRole', null);
}

export function requireDashboardAccess(
  context: Context<HttpEnvironment>,
  role: 'learner' | 'business' = 'learner',
): string {
  const learnerId = context.get('learnerId');
  if (
    !context.get('authenticated') ||
    context.get('accessRole') !== role ||
    learnerId === undefined
  ) {
    throw new HttpProblem({
      status: 401,
      code: 'sign_in_required',
      title: 'Sign in to your dashboard',
    });
  }
  return learnerId;
}
