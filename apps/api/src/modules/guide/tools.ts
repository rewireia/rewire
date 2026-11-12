import { findDemoCourse } from '@rewire/content';
import type { GuideCard, Region } from '@rewire/contracts';
import type { Engine, OccupationMatch } from '@rewire/engine';
import { z } from 'zod';

import { HttpProblem } from '../../http/problem.ts';
import type { CheckoutService } from '../checkout/checkout-service.ts';
import { toDecimalAmount } from '../checkout/money.ts';
import { presentMatch } from '../occupations/present.ts';
import type { PathwayService } from '../pathway/pathway-service.ts';
import type { StudyPlanService } from '../study-plan/study-plan-service.ts';

import type { GuideTool } from './model.ts';

/** What the tools of one request work on, and where they leave what they found. */
export interface ToolSession {
  readonly region: Region;
  /** Cards for the page, in the order the tools produced them. */
  readonly cards: GuideCard[];
  /** The learner of the request, if the browser has a session by now. */
  readonly learnerId: string | undefined;
  /** The same learner, created if there is none yet: only a purchase needs one. */
  ensureLearner(): Promise<string>;
}

export interface ToolDependencies {
  readonly engine: Engine;
  readonly checkout: CheckoutService;
  readonly pathways: PathwayService;
  readonly studyPlans: Pick<StudyPlanService, 'timelineFor' | 'save'>;
}

const MAXIMUM_SEARCH_RESULTS = 6;
const MAXIMUM_PROPOSALS = 3;

/** The occupations the model was shown in this request, by code and unit group. */
type Seen = Map<string, OccupationMatch>;

const keyOf = (code: string, isco08: string | undefined) => `${code}|${isco08 ?? ''}`;
const percent = (score: number) => Math.round(score * 100);
const unitGroupInput = z.object({ isco08: z.string().regex(/^\d{4}$/) });

/**
 * Finding the occupation behind a description.
 *
 * `search_occupations` shows the model official occupations; `propose_occupations` lets it
 * choose among the ones it was shown, and refuses any other code. That is what keeps an
 * invented occupation from ever reaching the person.
 */
export function occupationTools(engine: Engine, session: ToolSession): GuideTool[] {
  const seen: Seen = new Map();
  return [searchTool(engine, session, seen), proposeTool(engine, session, seen)];
}

/** Reading a report and a learning plan, and preparing a purchase the person must approve. */
export function learningTools(dependencies: ToolDependencies, session: ToolSession): GuideTool[] {
  return [
    reportTool(dependencies.engine, session),
    planTool(dependencies.pathways, session),
    purchaseTool(dependencies.checkout, session),
  ];
}

function searchTool(
  engine: Engine,
  session: ToolSession,
  seen: Seen,
): GuideTool<{ query: string }> {
  return {
    name: 'search_occupations',
    description:
      "Search the official classification of the person's region for a job title. Use short titles as a " +
      'worker would name the job ("payroll clerk"), not sentences. Call it again with other wordings when ' +
      'the results do not fit.',
    input: z.object({ query: z.string().min(2).max(120) }),
    run({ query }) {
      const matches = engine.searchOccupations(session.region, query, {
        limit: MAXIMUM_SEARCH_RESULTS,
      });
      for (const match of matches) {
        seen.set(keyOf(match.occupation.code, match.unitGroup?.isco08), match);
      }
      const lines = matches.map((match) => {
        const group = match.unitGroup;
        const title = group === undefined ? undefined : engine.exposureProfile(group.isco08)?.title;
        return [
          `code ${match.occupation.code}`,
          match.occupation.title,
          `matched "${match.matchedTitle.text}"`,
          group === undefined ? 'no international group' : `international group ${group.isco08}`,
          title === undefined ? 'not scored by the ILO' : `scored as "${title}"`,
        ].join(' | ');
      });
      return Promise.resolve(
        lines.length === 0 ? 'No occupation matches that title.' : lines.join('\n'),
      );
    },
  };
}

function proposeTool(
  engine: Engine,
  session: ToolSession,
  seen: Seen,
): GuideTool<{ choices: { code: string; isco08: string }[] }> {
  return {
    name: 'propose_occupations',
    description:
      'Show the person the occupations that best fit what they described, best first, at most three. Each ' +
      'choice must be a code and an international group exactly as search_occupations returned them.',
    input: z.object({
      choices: z
        .array(z.object({ code: z.string(), isco08: z.string() }))
        .min(1)
        .max(MAXIMUM_PROPOSALS),
    }),
    run({ choices }) {
      const matches = choices.map((choice) => seen.get(keyOf(choice.code, choice.isco08)));
      if (matches.includes(undefined)) {
        return Promise.resolve(
          'Refused: at least one choice is not a result of search_occupations. Propose only codes and groups ' +
            'you were shown.',
        );
      }
      session.cards.push({
        type: 'occupations',
        matches: matches.flatMap((match) =>
          match === undefined ? [] : [presentMatch(engine, match)],
        ),
      });
      return Promise.resolve(
        'Shown to the person. Tell them in one or two sentences why these fit.',
      );
    },
  };
}

function reportTool(engine: Engine, session: ToolSession): GuideTool<{ isco08: string }> {
  return {
    name: 'read_exposure_report',
    description:
      'Read what the ILO index says about an international group: its category, its standing and the score ' +
      'of each task from 0 to 100. The person sees its headline figures in a card under your answer.',
    input: unitGroupInput,
    run({ isco08 }) {
      const profile = engine.exposureProfile(isco08);
      if (profile === undefined) {
        return Promise.resolve('The ILO index has no scores for that group.');
      }
      const { title, meanScore, gradient, standing } = profile;
      session.cards.push({ type: 'report', isco08, title, meanScore, gradient, standing });
      const tasks = profile.tasks.map(
        (task) => `- ${percent(task.score)} (${task.band}): ${task.text}`,
      );
      return Promise.resolve(
        [
          `${profile.title}: mean score ${percent(profile.meanScore)}, category ${profile.gradient},`,
          `number ${profile.standing.moreExposed + 1} of ${profile.standing.outOf} from the most exposed.`,
          'Scores measure technical potential, not job loss. Tasks, most exposed first:',
          ...tasks,
        ].join('\n'),
      );
    },
  };
}

function planTool(pathways: PathwayService, session: ToolSession): GuideTool<{ isco08: string }> {
  return {
    name: 'read_learning_plan',
    description:
      "Read the learning plan for an international group in the person's region: free courses first, then " +
      'the paid courses of the demonstration catalogue with their price.',
    input: unitGroupInput,
    async run({ isco08 }) {
      const pathway = await pathways.pathwayFor(session.region, isco08, session.learnerId);
      if (pathway === undefined) {
        return 'There is no learning plan for that group.';
      }
      session.cards.push({
        type: 'courses',
        courses: pathway.steps.flatMap((step) => step.courses),
      });
      return pathway.steps
        .map((step) =>
          [
            `Step "${step.stage}":`,
            ...step.freeCourses.map((course) => `- free: ${course.title}, by ${course.provider}`),
            ...step.courses.map(
              (course) =>
                `- paid demo course, id ${course.id}: ${course.title}, ` +
                `${toDecimalAmount(course.price)} ${course.price.currency}, status ${course.enrolment}`,
            ),
          ].join('\n'),
        )
        .join('\n');
    },
  };
}

function purchaseTool(
  checkout: CheckoutService,
  session: ToolSession,
): GuideTool<{ courseId: string }> {
  return {
    name: 'prepare_course_purchase',
    description:
      'Open a PayPal order for a paid course when the person says they want to buy it. This charges nothing: ' +
      'the person sees a PayPal button and the payment happens only if they approve it there. Never call it ' +
      'unless the person asked to buy that course.',
    input: z.object({ courseId: z.string().min(1).max(80) }),
    async run({ courseId }) {
      const course = findDemoCourse(courseId);
      if (course === undefined) {
        return 'No paid course has that id. Read the learning plan for the ids.';
      }
      try {
        const order = await checkout.startOrder(await session.ensureLearner(), {
          courseId,
          region: session.region,
        });
        session.cards.push({ type: 'checkout', order, courseId, courseTitle: course.title });
        return (
          `Order opened for "${course.title}": ${toDecimalAmount(order.amount)} ${order.amount.currency}. ` +
          'A PayPal button is now shown to the person. Tell them nothing is charged until they approve it there.'
        );
      } catch (error) {
        // A purchase the checkout refuses, such as a course they already have, is something
        // to tell the person, not a failure of the conversation.
        if (error instanceof HttpProblem) {
          return `No order was opened: ${error.detail ?? error.title}`;
        }
        throw error;
      }
    },
  };
}
