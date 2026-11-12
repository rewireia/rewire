import type { Money, PlannedCourse, StudyTimeline } from '@rewire/contracts';

/** The plan in time in figures, as the head of "My roadmap" states them. */
export interface RoadmapFigures {
  readonly finishesOn: string | null;
  readonly hoursPerWeek: number;
  /** Hours of the courses in the plan whose length is published. */
  readonly knownHours: number;
  readonly inPlan: number;
  readonly done: number;
  /** Rewire courses in the plan already paid for, and still to pay. */
  readonly paid: number;
  readonly toPay: number;
  /** What the courses still to pay cost, one amount per currency. */
  readonly due: readonly Money[];
}

type PaidCourse = Extract<PlannedCourse, { kind: 'paid' }>;

/** Reads the figures from the plan the server laid out; nothing is estimated here. */
export function roadmapFigures(timeline: StudyTimeline): RoadmapFigures {
  const inPlan = timeline.stages
    .flatMap((stage) => stage.courses)
    .filter((course) => course.booking !== null);
  const paidCourses = inPlan.filter((course): course is PaidCourse => course.kind === 'paid');
  const owed = paidCourses.filter((course) => course.payment === 'due');
  return {
    finishesOn: timeline.finishesOn,
    hoursPerWeek: timeline.plan.hoursPerWeek,
    knownHours: timeline.knownHours,
    inPlan: inPlan.length,
    done: paidCourses.filter((course) => course.enrolment === 'completed').length,
    paid: paidCourses.filter((course) => course.payment === 'paid').length,
    toPay: owed.length,
    due: sumByCurrency(owed.map((course) => course.price)),
  };
}

function sumByCurrency(amounts: readonly Money[]): readonly Money[] {
  const totals = new Map<Money['currency'], number>();
  for (const { currency, minorUnits } of amounts) {
    totals.set(currency, (totals.get(currency) ?? 0) + minorUnits);
  }
  return [...totals].map(([currency, minorUnits]) => ({ currency, minorUnits }));
}
