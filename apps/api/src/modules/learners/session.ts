import type { Context, MiddlewareHandler } from 'hono';
import { getSignedCookie, setSignedCookie } from 'hono/cookie';

import type { HttpEnvironment } from '../../http/environment.ts';

import {
  clearDashboardAccess,
  grantDashboardAccess,
  hasDashboardAccess,
} from './dashboard-access.ts';

import type { LearnerStore } from './learner-store.ts';

const COOKIE_NAME = 'rewire_session';
const SIX_MONTHS_IN_SECONDS = 60 * 60 * 24 * 180;

export interface SessionOptions {
  /** Signs the cookie, so a learner id cannot be forged. */
  readonly secret: string;
  /** Send the cookie over HTTPS only. Off for local development on plain HTTP. */
  readonly secure: boolean;
}

/**
 * Sessions without accounts: the browser holds a signed cookie with a learner id. A
 * visitor has none until they save something, so reading the site leaves no trace.
 */
export interface Sessions {
  /** Reads the cookie of every request into `learnerId`. */
  readonly middleware: MiddlewareHandler<HttpEnvironment>;
  /** The learner of the request, created with their cookie if the visitor has none yet. */
  ensureLearner(context: Context<HttpEnvironment>): Promise<string>;
  authenticate(context: Context<HttpEnvironment>, role: 'learner' | 'business'): Promise<void>;
  signOut(context: Context<HttpEnvironment>): void;
}

export function createSessions(learners: LearnerStore, options: SessionOptions): Sessions {
  return {
    middleware: async (context, next) => {
      const signed = await getSignedCookie(context, options.secret, COOKIE_NAME);
      // A cookie with a broken signature reads as `false`, and counts as no cookie.
      const learnerId = typeof signed === 'string' ? signed : undefined;
      const known = learnerId === undefined ? undefined : await learners.find(learnerId);
      context.set('learnerId', known?.id);
      let role = await hasDashboardAccess(context, options.secret);
      const demoId = known ? await learners.demoId() : undefined;
      // A grant issued before the shared demo was adopted does not select another identity.
      if (role === 'learner' && known?.id !== demoId) role = null;
      if (known && role !== 'learner' && known.id === demoId) {
        context.set('learnerId', undefined);
        role = null;
      }
      context.header('Cache-Control', 'private, no-store');
      context.set('accessRole', role);
      context.set('authenticated', role !== null);
      await next();
    },

    async authenticate(context, role) {
      if (role === 'business') {
        const current = context.get('learnerId');
        const learnerId =
          context.get('accessRole') === 'business' && current !== undefined
            ? current
            : (await learners.create()).id;
        if (learnerId !== current) await bindLearner(context, learnerId, options);
        await grantDashboardAccess(context, learnerId, options, role);
        return;
      }
      if (context.get('accessRole') === 'business') context.set('learnerId', undefined);
      const current = await this.ensureLearner(context);
      const learnerId = await learners.claimDemo(current);
      if (learnerId !== current) await bindLearner(context, learnerId, options);
      await grantDashboardAccess(context, learnerId, options, role);
    },
    signOut: clearDashboardAccess,

    async ensureLearner(context) {
      const current = context.get('learnerId');
      if (current !== undefined) {
        return current;
      }
      const learner = await learners.create();
      await bindLearner(context, learner.id, options);
      return learner.id;
    },
  };
}

async function bindLearner(
  context: Context<HttpEnvironment>,
  learnerId: string,
  options: SessionOptions,
) {
  await setSignedCookie(context, COOKIE_NAME, learnerId, options.secret, {
    httpOnly: true,
    sameSite: 'Lax',
    secure: options.secure,
    path: '/',
    maxAge: SIX_MONTHS_IN_SECONDS,
  });
  context.set('learnerId', learnerId);
}
