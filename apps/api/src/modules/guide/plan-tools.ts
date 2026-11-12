import type { PlannedCourse, StudyPlan, StudyTimeline } from '@rewire/contracts';
import { z } from 'zod';

import { HttpProblem } from '../../http/problem.ts';
import type { StudyPlanService } from '../study-plan/study-plan-service.ts';

import type { GuideTool } from './model.ts';
import type { ToolSession } from './tools.ts';

const courseId = z.string().min(1).max(80);
const MAXIMUM_CHANGES = 20;

/** What the person asked to change in their plan. Whatever is left out stays as it is. */
const planChangeSchema = z.object({
  isco08: z.string().regex(/^\d{4}$/),
  /** Hours a week they give to learning. */
  hoursPerWeek: z.number().int().min(1).max(40).optional(),
  /** The day they start, as `YYYY-MM-DD`. */
  startsOn: z.iso.date().optional(),
  /** Courses to start no earlier than a day; `null` lets a course follow the one before again. */
  moves: z
    .array(z.object({ courseId, notBefore: z.iso.date().nullable() }))
    .max(MAXIMUM_CHANGES)
    .optional(),
  /** Courses to leave out of the plan, and courses to put back in. */
  leaveOut: z.array(courseId).max(MAXIMUM_CHANGES).optional(),
  putBack: z.array(courseId).max(MAXIMUM_CHANGES).optional(),
  /** Days to book for a course whose provider publishes no length. */
  bookings: z
    .array(z.object({ courseId, days: z.number().int().min(1).max(180) }))
    .max(MAXIMUM_CHANGES)
    .optional(),
});

export type PlanChange = z.infer<typeof planChangeSchema>;

/**
 * Reading the plan in time and changing it as the person asks: their pace, the day they
 * start, a course moved, booked or left out. The dates are worked out by the server after
 * every change; the model reads them and never writes one of its own.
 */
export function studyPlanTools(
  studyPlans: Pick<StudyPlanService, 'timelineFor' | 'save'>,
  session: ToolSession,
): GuideTool[] {
  return [readTool(studyPlans, session), changeTool(studyPlans, session)];
}

function readTool(
  studyPlans: Pick<StudyPlanService, 'timelineFor'>,
  session: ToolSession,
): GuideTool<{ isco08: string }> {
  return {
    name: 'read_study_plan',
    description:
      "Read the person's plan in time for an international group: their hours a week, the day they start, " +
      'the days each course takes and the day the plan ends. The person sees them in a card.',
    input: z.object({ isco08: z.string().regex(/^\d{4}$/) }),
    async run({ isco08 }) {
      const { region, learnerId } = session;
      const timeline = await studyPlans.timelineFor({ region, isco08, learnerId });
      if (timeline === undefined) {
        return 'There is no learning plan for that group.';
      }
      showPlan(session, timeline, false);
      return describeTimeline(timeline);
    },
  };
}

function changeTool(
  studyPlans: Pick<StudyPlanService, 'timelineFor' | 'save'>,
  session: ToolSession,
): GuideTool<PlanChange> {
  return {
    name: 'change_study_plan',
    description:
      "Change the person's plan in time when they ask to: their hours a week, the day they start, a course to " +
      'start no earlier than a day, a course to leave out or put back, or the days booked for a course ' +
      'whose length is not published. Give only what changes. The person sees the new dates in a card: ' +
      'tell them in words what changed.',
    input: planChangeSchema,
    async run(change) {
      const { region, learnerId } = session;
      const current = await studyPlans.timelineFor({ region, isco08: change.isco08, learnerId });
      if (current === undefined) {
        return 'There is no learning plan for that group.';
      }
      try {
        const timeline = await studyPlans.save(
          { region, isco08: change.isco08 },
          changedPlan(current.plan, change),
          () => session.ensureLearner(),
        );
        if (timeline === undefined) {
          return 'There is no learning plan for that group.';
        }
        showPlan(session, timeline, true);
        return `The plan was changed.\n${describeTimeline(timeline)}`;
      } catch (error) {
        // A change the plan cannot take, such as days for a course with published hours, is
        // something to tell the person, not a failure of the conversation.
        if (error instanceof HttpProblem) {
          const reasons = (error.issues ?? []).map((issue) => `${issue.path}: ${issue.message}`);
          return `The plan was not changed. ${reasons.join(' ') || (error.detail ?? error.title)}`;
        }
        throw error;
      }
    },
  };
}

/** A plan with a change applied. What the change does not name stays as it was. */
export function changedPlan(plan: StudyPlan, change: Omit<PlanChange, 'isco08'>): StudyPlan {
  const putBack = new Set(change.putBack);
  const leftOut = new Set(
    [...plan.leftOut, ...(change.leaveOut ?? [])].filter((id) => !putBack.has(id)),
  );
  const moves = new Map((change.moves ?? []).map((move) => [move.courseId, move.notBefore]));
  const kept = Object.entries(plan.notBefore).filter(([id]) => !moves.has(id));
  const moved = [...moves].flatMap(([id, day]) => (day === null ? [] : [[id, day] as const]));
  const booked = (change.bookings ?? []).map(({ courseId: id, days }) => [id, days] as const);
  return {
    startsOn: change.startsOn ?? plan.startsOn,
    hoursPerWeek: change.hoursPerWeek ?? plan.hoursPerWeek,
    leftOut: [...leftOut],
    notBefore: Object.fromEntries([...kept, ...moved]),
    bookedDays: { ...plan.bookedDays, ...Object.fromEntries(booked) },
  };
}

/**
 * Shows the plan as it stands now. An answer that reads the plan and then changes it shows
 * it once, as changed: the card of an earlier reading would show dates that no longer hold.
 */
function showPlan(session: ToolSession, timeline: StudyTimeline, changed: boolean): void {
  const earlier = session.cards.findIndex(
    (card) => card.type === 'plan' && card.isco08 === timeline.isco08,
  );
  const shown = earlier === -1 ? undefined : session.cards.splice(earlier, 1)[0];
  session.cards.push({
    type: 'plan',
    isco08: timeline.isco08,
    hoursPerWeek: timeline.plan.hoursPerWeek,
    startsOn: timeline.plan.startsOn,
    finishesOn: timeline.finishesOn,
    changed: changed || (shown?.type === 'plan' && shown.changed),
  });
}

/** The plan in time as the model reads it: one line for the whole, one for each course. */
function describeTimeline(timeline: StudyTimeline): string {
  const { plan, finishesOn } = timeline;
  const end = finishesOn === null ? 'it holds no course' : `it ends on ${finishesOn}`;
  return [
    `Plan in time: ${plan.hoursPerWeek} hours a week from ${plan.startsOn}; ${end}.`,
    ...timeline.stages.flatMap((stage) => [
      `Step "${stage.stage}":`,
      ...stage.courses.map(describeCourse),
    ]),
  ].join('\n');
}

function describeCourse(course: PlannedCourse): string {
  const length = course.hours === null ? 'length not published' : `${course.hours} hours of course`;
  const when =
    course.booking === null
      ? 'left out of the plan'
      : `${course.booking.startsOn} to ${course.booking.endsOn}` +
        (course.booking.moved ? ', moved by the person' : '') +
        (course.booking.heldByPayment ? ', held back by its payment' : '');
  const kind = course.kind === 'free' ? 'free' : `paid demo, payment ${paymentOf(course)}`;
  return `- id ${course.id} | ${kind} | ${course.title} | ${length} | ${when}`;
}

/** The payment of a paid course in words the model can repeat. */
function paymentOf(course: Extract<PlannedCourse, { kind: 'paid' }>): string {
  switch (course.payment) {
    case 'paid':
      return `made on ${course.paidOn ?? 'a day not recorded'}`;
    case 'held-by-paypal':
      return 'held by PayPal for review';
    case 'invoice-sent':
      return 'waiting for the employer to pay the invoice';
    case 'refunded':
      return 'refunded';
    case 'due':
      return 'not made yet';
  }
}
