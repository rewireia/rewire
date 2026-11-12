import {
  personalExposureRequestSchema,
  type PersonalExposure,
  type TaskRationale,
  type UnitGroupList,
} from '@rewire/contracts';
import type { TaskRationales } from '@rewire/data';
import { personalExposureOf, type Engine, type ExposureProfile } from '@rewire/engine';
import { Hono } from 'hono';

import type { HttpEnvironment } from '../../http/environment.ts';
import { invalidInput, notFound } from '../../http/problem.ts';
import { parseBody } from '../../http/validate.ts';

import { presentReport } from './present.ts';
import type { createTaskTranslations } from './translation.ts';

export interface ExposureDependencies {
  readonly engine: Engine;
  readonly translateTasks: ReturnType<typeof createTaskTranslations>;
  /** Reads the model reasoning behind the task scores; called at most once. */
  readonly loadTaskRationales: () => Promise<TaskRationales>;
}

/** Names the models as the ILO paper does. */
const MODEL_NAMES = { gpt4o: 'GPT-4o', gemini: 'Gemini Flash 1.5' } as const;

/** What the ILO index says about each occupation, and about one person's version of it. */
export function exposureRoutes({
  engine,
  translateTasks,
  loadTaskRationales,
}: ExposureDependencies): Hono<HttpEnvironment> {
  const profileOf = (isco08: string): ExposureProfile => {
    const profile = engine.exposureProfile(isco08);
    if (profile === undefined) {
      throw notFound('A scored occupation with that code');
    }
    return profile;
  };

  return new Hono<HttpEnvironment>()
    .get('/unit-groups', (context) => {
      const list: UnitGroupList = { unitGroups: [...engine.unitGroups()] };
      return context.json(list);
    })
    .get('/unit-groups/:isco08', (context) =>
      context.json(presentReport(profileOf(context.req.param('isco08')))),
    )
    .get('/unit-groups/:isco08/task-translations', async (context) => {
      requireSpanish(context.req.query('lang'));
      return context.json(await translateTasks(profileOf(context.req.param('isco08'))));
    })
    .post('/unit-groups/:isco08/personal-exposure', async (context) => {
      const profile = profileOf(context.req.param('isco08'));
      const body = await parseBody(context, personalExposureRequestSchema);
      const taskIds = new Set(profile.tasks.map((task) => task.id));
      const unknown = Object.keys(body.timeByTask).filter((taskId) => !taskIds.has(taskId));
      if (unknown.length > 0) {
        throw invalidInput(
          unknown.map((taskId) => ({
            path: `timeByTask.${taskId}`,
            message: 'This occupation has no such task.',
          })),
        );
      }
      const personal: PersonalExposure = personalExposureOf(
        profile,
        new Map(Object.entries(body.timeByTask)),
      );
      return context.json(personal);
    })
    .get('/unit-groups/:isco08/tasks/:taskId/rationale', async (context) => {
      const profile = profileOf(context.req.param('isco08'));
      const taskId = context.req.param('taskId');
      const published = (await loadTaskRationales())[taskId];
      if (published === undefined || !profile.tasks.some((task) => task.id === taskId)) {
        throw notFound('That task');
      }
      const rationale: TaskRationale = {
        taskId,
        rationales: [
          { model: MODEL_NAMES.gpt4o, text: published.gpt4o },
          { model: MODEL_NAMES.gemini, text: published.gemini },
        ].flatMap(({ model, text }) => (text === null ? [] : [{ model, text }])),
      };
      return context.json(rationale);
    });
}

function requireSpanish(language: string | undefined): void {
  if (language !== 'es') {
    throw invalidInput([{ path: 'lang', message: 'Only es is supported.' }]);
  }
}
