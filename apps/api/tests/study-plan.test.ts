import { findDemoCourse } from '@rewire/content';
import {
  pathwaySchema,
  sessionSchema,
  studyTimelineSchema,
  type StudyPlan,
} from '@rewire/contracts';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { bodyOf, type TestClient } from './support/client.ts';
import {
  courseOf,
  coursesOf,
  daysOf,
  FREE_WITH_HOURS,
  FREE_WITHOUT_HOURS,
  MILLISECONDS_PER_DAY,
  PAID,
  plan,
  PLAN_URL,
  readTimeline,
  savePlan,
  TODAY,
} from './support/study-plan.ts';
import { createTestApi, expectProblem, type TestApi } from './support/test-api.ts';

const paidCourse = findDemoCourse(PAID);
if (paidCourse === undefined) {
  throw new Error(`the catalogue has no ${PAID}`);
}

let api: TestApi;
let learner: TestClient;

beforeEach(async () => {
  api = await createTestApi();
  learner = api.client();
});

afterEach(async () => {
  await api.close();
});

const timelineOf = (client = learner) => readTimeline(client);
const save = (changes: Partial<StudyPlan> = {}, client = learner) => savePlan(client, changes);

describe('the plan in time', () => {
  it('does not exist for an unknown region or an occupation without a score', async () => {
    await expectProblem(
      await learner.get('/api/regions/xx/study-plan?isco08=4313'),
      404,
      'not_found',
    );
    await expectProblem(
      await learner.get('/api/regions/us/study-plan?isco08=0000'),
      404,
      'not_found',
    );
    await expectProblem(await learner.get('/api/regions/us/study-plan'), 400, 'invalid_input');
  });

  it('starts a visitor today, at four hours a week, and leaves no session behind', async () => {
    const timeline = await timelineOf();
    expect(timeline).toMatchObject({ region: 'us', isco08: '4313', saved: false });
    expect(timeline.plan).toEqual(plan());
    expect(learner.cookie).toBeUndefined();
  });

  it('starts a visitor on the day it is where they are', async () => {
    const startOf = async (today: string) =>
      bodyOf(await learner.get(`${PLAN_URL}&today=${today}`), 200, studyTimelineSchema).then(
        (timeline) => timeline.plan.startsOn,
      );
    // The evening before in Honolulu, the morning after in Auckland.
    expect(await startOf('2026-11-10')).toBe('2026-11-10');
    expect(await startOf('2026-11-12')).toBe('2026-11-12');
    // Further than time zones reach: the clock of the browser is wrong, the server's counts.
    expect(await startOf('2026-11-20')).toBe(TODAY);
    expect(await startOf('2026-11-09')).toBe(TODAY);
    await expectProblem(await learner.get(`${PLAN_URL}&today=tomorrow`), 400, 'invalid_input');
  });

  it('keeps the order of the learning plan: its steps, and free courses first', async () => {
    const timeline = await timelineOf();
    expect(timeline.stages.map((stage) => stage.stage)).toEqual([
      'understand',
      'apply',
      'strengthen',
    ]);
    const pathway = await bodyOf(
      await learner.get('/api/regions/us/pathway?isco08=4313'),
      200,
      pathwaySchema,
    );
    for (const [index, step] of pathway.steps.entries()) {
      const inThePlan = [...step.freeCourses, ...step.courses].map((course) => course.id);
      expect(timeline.stages[index]?.courses.map((course) => course.id)).toEqual(inThePlan);
    }
    expect(courseOf(timeline, PAID)).toMatchObject({
      kind: 'paid',
      stage: 'understand',
      url: null,
    });
    expect(courseOf(timeline, FREE_WITH_HOURS).url).toBe(
      'https://anthropic.skilljar.com/ai-fluency-framework-foundations',
    );
  });

  it('books each course the day after the one ahead of it ends', async () => {
    const courses = coursesOf(await timelineOf());
    expect(courses[0]?.booking?.startsOn).toBe(TODAY);
    expect(courses.every((course) => course.booking !== null)).toBe(true);
    for (const [index, course] of courses.entries()) {
      const previousEnd = courses[index - 1]?.booking?.endsOn;
      if (previousEnd !== undefined) {
        const dayAfter = new Date(Date.parse(previousEnd) + MILLISECONDS_PER_DAY);
        expect(course.booking?.startsOn).toBe(dayAfter.toISOString().slice(0, 10));
      }
    }
    expect((await timelineOf()).finishesOn).toBe(courses.at(-1)?.booking?.endsOn);
  });

  it('gives a course its published hours at the weekly pace, rounded up to whole days', async () => {
    const atFour = await save({ hoursPerWeek: 4 });
    // 4 hours at 4 a week is a week; 1.5 hours is 2.625 days, booked as 3.
    expect(courseOf(atFour, FREE_WITH_HOURS).hours).toBe(4);
    expect(daysOf(courseOf(atFour, FREE_WITH_HOURS))).toBe(7);
    expect(courseOf(atFour, PAID).hours).toBe(paidCourse.hours);
    expect(daysOf(courseOf(atFour, PAID))).toBe(3);

    const atTwo = await save({ hoursPerWeek: 2 });
    expect(daysOf(courseOf(atTwo, FREE_WITH_HOURS))).toBe(14);
    expect(Date.parse(atTwo.finishesOn ?? '')).toBeGreaterThan(Date.parse(atFour.finishesOn ?? ''));
  });

  it('books a week for a course of unpublished length, until the learner says', async () => {
    const before = await timelineOf();
    expect(before.defaultBookedDays).toBe(7);
    expect(courseOf(before, FREE_WITHOUT_HOURS).hours).toBeNull();
    expect(daysOf(courseOf(before, FREE_WITHOUT_HOURS))).toBe(7);

    const after = await save({ bookedDays: { [FREE_WITHOUT_HOURS]: 21 } });
    expect(daysOf(courseOf(after, FREE_WITHOUT_HOURS))).toBe(21);
  });

  it('adds up the published hours of the courses in the plan only', async () => {
    const whole = await timelineOf();
    const published = coursesOf(whole).reduce((sum, course) => sum + (course.hours ?? 0), 0);
    expect(whole.knownHours).toBe(published);

    const shorter = await save({ leftOut: [FREE_WITH_HOURS] });
    expect(shorter.knownHours).toBe(published - 4);
  });
});

describe('a plan of their own', () => {
  it('makes a visitor a learner on the first save, and is theirs alone', async () => {
    const saved = await save({ startsOn: '2026-12-01', hoursPerWeek: 6 });
    expect(saved.saved).toBe(true);
    expect(learner.cookie).toBeDefined();
    const session = await bodyOf(await learner.get('/api/session'), 200, sessionSchema);
    expect(session.signedIn).toBe(true);

    expect((await timelineOf()).plan).toEqual(plan({ startsOn: '2026-12-01', hoursPerWeek: 6 }));
    expect((await timelineOf(api.client())).saved).toBe(false);
  });

  it('replaces the plan whole on every save', async () => {
    await save({ leftOut: [FREE_WITHOUT_HOURS], hoursPerWeek: 10 });
    const second = await save({ hoursPerWeek: 3 });
    expect(second.plan).toEqual(plan({ hoursPerWeek: 3 }));
    expect(courseOf(second, FREE_WITHOUT_HOURS).booking).not.toBeNull();
  });

  it('never starts a course before the day the learner moved it to', async () => {
    const before = await timelineOf();
    const moved = await save({ notBefore: { [PAID]: '2027-01-11' } });
    expect(courseOf(moved, PAID).booking).toMatchObject({ startsOn: '2027-01-11', moved: true });
    // What comes before stays where it was; what comes after follows.
    const ahead = coursesOf(moved)[0];
    expect(ahead?.booking).toEqual(coursesOf(before)[0]?.booking);
    expect(Date.parse(moved.finishesOn ?? '')).toBeGreaterThan(Date.parse(before.finishesOn ?? ''));
  });

  it('does not move a course ahead of the one before it', async () => {
    const before = await timelineOf();
    const pulled = await save({ notBefore: { [PAID]: '2020-01-01' } });
    expect(courseOf(pulled, PAID).booking).toEqual({
      ...courseOf(before, PAID).booking,
      moved: true,
    });
  });

  it('gives a course left out no days, and closes the gap', async () => {
    const before = await timelineOf();
    const [first, second] = coursesOf(before);
    if (first === undefined || second === undefined) {
      throw new Error('the plan has fewer than two courses');
    }
    const after = await save({ leftOut: [first.id] });
    expect(courseOf(after, first.id).booking).toBeNull();
    expect(courseOf(after, second.id).booking?.startsOn).toBe(TODAY);
  });

  it('ignores the day a course left out was moved to', async () => {
    const without = await save({ leftOut: [PAID] });
    const moved = await save({ leftOut: [PAID], notBefore: { [PAID]: '2027-06-01' } });
    expect(courseOf(moved, PAID).booking).toBeNull();
    expect(moved.finishesOn).toBe(without.finishesOn);
  });

  it('follows the learner to another occupation', async () => {
    await save({ hoursPerWeek: 6, startsOn: '2026-12-01' });
    const elsewhere = await bodyOf(
      await learner.get('/api/regions/us/study-plan?isco08=2512'),
      200,
      studyTimelineSchema,
    );
    expect(elsewhere).toMatchObject({ isco08: '2512', saved: true });
    expect(elsewhere.plan).toEqual(plan({ hoursPerWeek: 6, startsOn: '2026-12-01' }));
  });

  it('has no end when every course is left out', async () => {
    const everyCourse = coursesOf(await timelineOf()).map((course) => course.id);
    const empty = await save({ leftOut: everyCourse });
    expect(empty.finishesOn).toBeNull();
    expect(empty.knownHours).toBe(0);
  });

  it('refuses a plan that names a course of no catalogue', async () => {
    for (const changes of [
      { leftOut: ['no-such-course'] },
      { notBefore: { 'no-such-course': TODAY } },
      { bookedDays: { 'no-such-course': 3 } },
    ]) {
      const problem = await expectProblem(
        await learner.put(PLAN_URL, plan(changes)),
        400,
        'invalid_input',
      );
      expect(problem.issues?.[0]?.message).toBe('No course has that id.');
    }
    expect(learner.cookie).toBeUndefined();
  });

  it('refuses a course left out twice', async () => {
    await expectProblem(
      await learner.put(PLAN_URL, plan({ leftOut: [PAID, PAID] })),
      400,
      'invalid_input',
    );
  });

  it('refuses days booked by hand for a course with published hours', async () => {
    const problem = await expectProblem(
      await learner.put(PLAN_URL, plan({ bookedDays: { [PAID]: 30 } })),
      400,
      'invalid_input',
    );
    expect(problem.issues).toEqual([
      {
        path: `bookedDays.${PAID}`,
        message: 'The length of this course comes from its published hours.',
      },
    ]);
  });

  it('refuses a pace or a day out of range', async () => {
    for (const changes of [
      { hoursPerWeek: 0 },
      { hoursPerWeek: 41 },
      { hoursPerWeek: 2.5 },
      { startsOn: '2026-02-30' },
      { startsOn: '1999-12-31' },
      { notBefore: { [PAID]: '2101-01-01' } },
      { bookedDays: { [FREE_WITHOUT_HOURS]: 0 } },
      { bookedDays: { [FREE_WITHOUT_HOURS]: 181 } },
    ]) {
      await expectProblem(await learner.put(PLAN_URL, plan(changes)), 400, 'invalid_input');
    }
  });

  it('saves nothing, and opens no session, for an occupation without a score', async () => {
    await expectProblem(
      await learner.put('/api/regions/us/study-plan?isco08=0000', plan()),
      404,
      'not_found',
    );
    expect(learner.cookie).toBeUndefined();
  });
});
