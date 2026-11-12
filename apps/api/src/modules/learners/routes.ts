import { learnerProfileSchema, type LearnerProfile, type Session } from '@rewire/contracts';
import type { Engine } from '@rewire/engine';
import { Hono } from 'hono';

import type { HttpEnvironment } from '../../http/environment.ts';
import { invalidInput } from '../../http/problem.ts';
import { parseBody } from '../../http/validate.ts';
import { unitGroupsOf } from '../occupations/present.ts';

import { accessRoutes } from './access-routes.ts';

import type { Learner, LearnerStore } from './learner-store.ts';
import type { Sessions } from './session.ts';

export interface LearnerDependencies {
  readonly engine: Engine;
  readonly learners: LearnerStore;
  readonly sessions: Sessions;
}

/** Who the browser is, and the occupation they confirmed. */
export function learnerRoutes({
  engine,
  learners,
  sessions,
}: LearnerDependencies): Hono<HttpEnvironment> {
  return (
    new Hono<HttpEnvironment>()
      .route('/', accessRoutes(sessions))
      .get('/session', async (context) => {
        const learnerId = context.get('learnerId');
        const learner = learnerId === undefined ? undefined : await learners.find(learnerId);
        return context.json(sessionOf(learner, context.get('accessRole')));
      })
      // Starts a session without saving anything, for what needs one before the first save: the
      // analyst of "Analyse" answers only a browser with a session.
      .post('/session', async (context) => {
        const learnerId = await sessions.ensureLearner(context);
        return context.json(sessionOf(await learners.find(learnerId), context.get('accessRole')));
      })
      .put('/session/profile', async (context) => {
        const profile = await parseBody(context, learnerProfileSchema);
        checkProfile(engine, profile);
        const learnerId = await sessions.ensureLearner(context);
        await learners.saveProfile(learnerId, profile);
        return context.json(sessionOf(await learners.find(learnerId), context.get('accessRole')));
      })
  );
}

/**
 * A profile is kept only if the engine can stand behind it: an occupation of the region's
 * classification, read through one of its own unit groups, which the ILO has scored, and
 * time given only to tasks of that group.
 */
function checkProfile(engine: Engine, { region, occupation, timeByTask }: LearnerProfile): void {
  const regional = engine.findOccupation(region, occupation.code);
  if (regional === undefined) {
    throw invalidInput([
      {
        path: 'occupation.code',
        message: 'The classification of the region has no such occupation.',
      },
    ]);
  }
  if (!unitGroupsOf(regional).has(occupation.isco08)) {
    throw invalidInput([
      { path: 'occupation.isco08', message: 'This occupation cannot be read through that group.' },
    ]);
  }
  const exposure = engine.exposureProfile(occupation.isco08);
  if (exposure === undefined) {
    throw invalidInput([
      { path: 'occupation.isco08', message: 'No scored occupation has that code.' },
    ]);
  }
  const taskIds = new Set(exposure.tasks.map((task) => task.id));
  const unknown = Object.keys(timeByTask).filter((taskId) => !taskIds.has(taskId));
  if (unknown.length > 0) {
    throw invalidInput(
      unknown.map((taskId) => ({
        path: `timeByTask.${taskId}`,
        message: 'This occupation has no such task.',
      })),
    );
  }
}

function sessionOf(learner: Learner | undefined, accessRole: Session['accessRole']): Session {
  return {
    signedIn: learner !== undefined,
    authenticated: accessRole !== null,
    accessRole,
    profile: learner?.profile ?? null,
    certificateName: learner?.certificateName ?? null,
  };
}
