import { DEMO_COURSES, findDemoCourse, priceOf } from '@rewire/content';
import { courseCardSchema, courseCatalogueSchema } from '@rewire/contracts';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { bodyOf, type TestClient } from './support/client.ts';
import { buyCourse, createTestApi, expectProblem, type TestApi } from './support/test-api.ts';

const COURSE_ID = 'ai-for-office-work';

let api: TestApi;
let learner: TestClient;

beforeEach(async () => {
  api = await createTestApi();
  learner = api.client();
});

afterEach(async () => {
  await api.close();
});

describe('the catalogue of a region', () => {
  it('lists every published hosted course at the price of the region', async () => {
    const { courses } = await bodyOf(
      await learner.get('/api/regions/uk/courses'),
      200,
      courseCatalogueSchema,
    );
    const hosted = courses.filter((course) => course.kind === 'hosted');
    expect(hosted.map((course) => course.id)).toEqual(DEMO_COURSES.map((course) => course.id));
    for (const card of hosted) {
      const course = findDemoCourse(card.id);
      expect(card.price).toEqual(course === undefined ? undefined : priceOf(course, 'GBP'));
      expect(card).toMatchObject({ provider: 'Rewire', url: null, enrolment: 'none' });
    }
  });

  it('shows where the learner of the session stands with each course', async () => {
    await buyCourse(learner, COURSE_ID);
    const { courses } = await bodyOf(
      await learner.get('/api/regions/us/courses'),
      200,
      courseCatalogueSchema,
    );
    const standing = Object.fromEntries(courses.map((course) => [course.id, course.enrolment]));
    expect(standing[COURSE_ID]).toBe('active');
    expect(Object.values(standing).filter((status) => status !== 'none')).toHaveLength(1);
  });

  it('answers one course by its id, and 404 for a course it does not have', async () => {
    const card = await bodyOf(
      await learner.get(`/api/regions/eu/courses/${COURSE_ID}`),
      200,
      courseCardSchema,
    );
    expect(card.price.currency).toBe('EUR');
    await expectProblem(
      await learner.get('/api/regions/eu/courses/no-such-course'),
      404,
      'not_found',
    );
  });
});
