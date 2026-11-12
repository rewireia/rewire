import type { PlannedCourse, RoadmapCourse, StudyTimeline } from '@rewire/contracts';
import { describe, expect, it } from 'vitest';

import { withoutCourse } from '../src/features/dashboard/roadmap-edit.ts';
import { roadmapFigures } from '../src/features/dashboard/roadmap-figures.ts';

const course = (
  courseId: string,
  date: string,
  status: RoadmapCourse['status'] = 'selected',
): RoadmapCourse => ({
  courseId,
  title: courseId,
  date,
  hours: 2,
  price: { currency: 'USD', minorUnits: 1900 },
  status,
});

describe('taking a course out of the plan', () => {
  it('keeps every other course, paid or not, and never a refunded one', () => {
    const plan = [
      course('a', '2027-01-04', 'completed'),
      course('b', '2027-02-01'),
      course('c', '2027-03-01', 'revoked'),
      course('d', '2027-03-08'),
    ];
    expect(withoutCourse(plan, 'b')).toEqual(['a', 'd']);
  });

  it('leaves an empty plan when the course is the only one', () => {
    expect(withoutCourse([course('a', '2027-01-04')], 'a')).toEqual([]);
  });
});

describe('the roadmap in figures', () => {
  const booking = {
    startsOn: '2026-11-12',
    endsOn: '2026-11-20',
    moved: false,
    heldByPayment: false,
  };
  const free: PlannedCourse = {
    id: 'free',
    title: 'Free',
    stage: 'understand',
    hours: 3,
    booking,
    kind: 'free',
    url: 'https://example.org/free',
    progress: 0,
    enrolment: null,
    price: null,
    payment: null,
    paidOn: null,
  };
  const paid = (
    id: string,
    payment: 'due' | 'paid',
    enrolment: 'none' | 'active' | 'completed',
    minorUnits: number,
    inPlan = true,
  ): PlannedCourse => ({
    id,
    title: id,
    stage: 'apply',
    hours: 2,
    booking: inPlan ? booking : null,
    kind: 'paid',
    url: null,
    progress: enrolment === 'completed' ? 1 : 0,
    enrolment,
    price: { currency: 'USD', minorUnits },
    payment,
    paidOn: payment === 'paid' ? '2026-11-10' : null,
  });

  it('counts the courses in the plan and adds up what is still to pay', () => {
    const timeline: StudyTimeline = {
      region: 'us',
      isco08: '4313',
      plan: { startsOn: '2026-11-12', hoursPerWeek: 4, leftOut: [], notBefore: {}, bookedDays: {} },
      saved: true,
      stages: [
        { stage: 'understand', courses: [free, paid('a', 'paid', 'completed', 1900)] },
        {
          stage: 'apply',
          courses: [
            paid('b', 'due', 'none', 1500),
            paid('c', 'due', 'none', 2300),
            paid('d', 'due', 'none', 9900, false),
          ],
        },
      ],
      finishesOn: '2027-04-16',
      knownHours: 9,
      defaultBookedDays: 7,
    };
    expect(roadmapFigures(timeline)).toEqual({
      finishesOn: '2027-04-16',
      hoursPerWeek: 4,
      knownHours: 9,
      inPlan: 4,
      done: 1,
      paid: 1,
      toPay: 2,
      due: [{ currency: 'USD', minorUnits: 3800 }],
    });
  });
});
