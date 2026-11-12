import { findDemoCourse } from '@rewire/content';
import { studyTimelineSchema, type StudyPlan } from '@rewire/contracts';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { bodyOf, type TestClient } from './support/client.ts';
import {
  courseOf,
  coursesOf,
  daysOf,
  FREE_WITH_HOURS,
  FREE_WITHOUT_HOURS,
  PAID,
  plan,
  PLAN_URL,
  readTimeline,
  savePlan,
  TODAY,
} from './support/study-plan.ts';
import { buyCourse, createTestApi, type TestApi } from './support/test-api.ts';

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

describe('a plan saved some time ago', () => {
  /** Rewrites the plan the learner saved, as an older version of Rewire left it. */
  const leftBehind = async (stored: unknown) => {
    await save();
    await api.database.execute('UPDATE study_plans SET plan = ?', [JSON.stringify(stored)]);
  };

  it('drops what it says about a course withdrawn, or one that now publishes its hours', async () => {
    await leftBehind(
      plan({
        leftOut: ['a-course-withdrawn', FREE_WITHOUT_HOURS],
        notBefore: { 'a-course-withdrawn': '2027-01-01', [PAID]: '2027-01-11' },
        bookedDays: { 'a-course-withdrawn': 5, [FREE_WITH_HOURS]: 30 },
      }),
    );
    const timeline = await timelineOf();
    expect(timeline.saved).toBe(true);
    expect(timeline.plan).toEqual(
      plan({ leftOut: [FREE_WITHOUT_HOURS], notBefore: { [PAID]: '2027-01-11' } }),
    );
    // Its hours decide the length again, and the plan read can be saved as it is.
    expect(daysOf(courseOf(timeline, FREE_WITH_HOURS))).toBe(7);
    expect(
      (await bodyOf(await learner.put(PLAN_URL, timeline.plan), 200, studyTimelineSchema)).plan,
    ).toEqual(timeline.plan);
  });

  it('counts as none when the rules have changed since, so the learner starts again', async () => {
    await leftBehind({ startsOn: TODAY, hoursPerWeek: 400 });
    const timeline = await timelineOf();
    expect(timeline.saved).toBe(false);
    expect(timeline.plan).toEqual(plan());
    expect((await save({ hoursPerWeek: 8 })).saved).toBe(true);
  });
});

describe('progress on the plan', () => {
  it('is none for a visitor and for a free course', async () => {
    const timeline = await timelineOf();
    expect(coursesOf(timeline).every((course) => course.progress === 0)).toBe(true);
    expect(courseOf(timeline, FREE_WITH_HOURS).enrolment).toBeNull();
    expect(courseOf(timeline, PAID).enrolment).toBe('none');
  });

  it('counts every lesson and the quiz of a paid course as one step each', async () => {
    await buyCourse(learner, PAID);
    expect(courseOf(await timelineOf(), PAID)).toMatchObject({ enrolment: 'active', progress: 0 });

    const steps = paidCourse.lessons.length + 1;
    for (const [index, lesson] of paidCourse.lessons.entries()) {
      await learner.post(`/api/learning/courses/${PAID}/lessons/${lesson.id}/complete`);
      expect(courseOf(await timelineOf(), PAID).progress).toBeCloseTo((index + 1) / steps);
    }

    const answers = paidCourse.quiz.questions.map((question) => question.correctOption);
    await learner.post(`/api/learning/courses/${PAID}/quiz`, { answers });
    expect(courseOf(await timelineOf(), PAID)).toMatchObject({
      enrolment: 'completed',
      progress: 1,
    });
  });
});
