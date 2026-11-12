import { dashboardGet } from './support/client.ts';
import { findDemoCourse } from '@rewire/content';
import { certificateSchema, courseContentSchema, enrolmentListSchema } from '@rewire/contracts';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { bodyOf, type TestClient } from './support/client.ts';
import { buyCourse, createTestApi, expectProblem, type TestApi } from './support/test-api.ts';

const COURSE_ID = 'ai-foundations';
const course = findDemoCourse(COURSE_ID);
if (course === undefined) {
  throw new Error(`the catalogue has no ${COURSE_ID}`);
}
const rightAnswers = course.quiz.questions.map((question) => question.correctOption);

let api: TestApi;
let learner: TestClient;

beforeEach(async () => {
  api = await createTestApi();
  learner = api.client();
});

afterEach(async () => {
  await api.close();
});

const contentOf = async (client = learner) =>
  bodyOf(await client.get(`/api/learning/courses/${COURSE_ID}`), 200, courseContentSchema);

/** Takes the course to its end: every lesson done and the quiz passed. */
const completeCourse = async (client = learner) => {
  for (const lesson of course.lessons) {
    await client.post(`/api/learning/courses/${COURSE_ID}/lessons/${lesson.id}/complete`);
  }
  await client.post(`/api/learning/courses/${COURSE_ID}/quiz`, { answers: rightAnswers });
};

const askCertificate = (learnerName: string, client = learner) =>
  client.post(`/api/learning/courses/${COURSE_ID}/certificate`, { learnerName });

describe('a certificate', () => {
  it('is a clear 503 when no free id is found, and the course stays completed', async () => {
    await api.close();
    api = await createTestApi({ overrides: { newCertificateId: () => 'RWR-AAAA-AAAA' } });
    const first = api.client();
    const second = api.client();
    for (const client of [first, second]) {
      await buyCourse(client, COURSE_ID);
      await completeCourse(client);
    }
    await bodyOf(await askCertificate('First Learner', first), 201, certificateSchema);
    await expectProblem(
      await askCertificate('Second Learner', second),
      503,
      'certificate_unavailable',
    );
    expect((await contentOf(second)).status).toBe('completed');
  });
});

describe('a refund', () => {
  it('closes a completed course, and its certificate stays verifiable', async () => {
    const { orderId, paypalOrderId } = await buyCourse(learner, COURSE_ID);
    await completeCourse();
    const certificate = await bodyOf(await askCertificate('A Learner'), 201, certificateSchema);
    // Rewire refuses to refund a completed course; the merchant can, from PayPal.
    api.gateway.refundAtPayPal(paypalOrderId);
    expect((await learner.post(`/api/payments/${orderId}/refresh`)).status).toBe(200);

    const dashboard = await bodyOf(
      await dashboardGet(learner, '/api/learning'),
      200,
      enrolmentListSchema,
    );
    expect(dashboard.enrolments).toEqual([]);
    await expectProblem(await learner.get(`/api/learning/courses/${COURSE_ID}`), 404, 'not_found');
    const verified = await bodyOf(
      await api.client().get(`/api/certificates/${certificate.id}`),
      200,
      certificateSchema,
    );
    expect(verified).toEqual(certificate);
  });
});
