import { dashboardGet } from './support/client.ts';
import { findDemoCourse } from '@rewire/content';
import {
  certificateSchema,
  courseContentSchema,
  enrolmentListSchema,
  exposureReportSchema,
  paymentListSchema,
  quizResultSchema,
  sessionSchema,
} from '@rewire/contracts';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { anyString, bodyOf, matching, type TestClient } from './support/client.ts';
import { buyCourse, createTestApi, expectProblem, type TestApi } from './support/test-api.ts';

const COURSE_ID = 'ai-foundations';
const course = findDemoCourse(COURSE_ID);
if (course === undefined) {
  throw new Error(`the catalogue has no ${COURSE_ID}`);
}
const rightAnswers = course.quiz.questions.map((question) => question.correctOption);
const wrongAnswers = course.quiz.questions.map((question) => (question.correctOption + 1) % 3);
const PAYROLL_CLERK = { code: '43-3051.00', title: 'Payroll clerk', isco08: '4313' };

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

const completeEveryLesson = async (client = learner) => {
  for (const lesson of course.lessons) {
    const response = await client.post(
      `/api/learning/courses/${COURSE_ID}/lessons/${lesson.id}/complete`,
    );
    expect(response.status).toBe(204);
  }
};

const takeQuiz = async (answers: number[], client = learner) =>
  bodyOf(
    await client.post(`/api/learning/courses/${COURSE_ID}/quiz`, { answers }),
    200,
    quizResultSchema,
  );

const askCertificate = (learnerName: string, client = learner) =>
  client.post(`/api/learning/courses/${COURSE_ID}/certificate`, { learnerName });

async function readDashboard(client: TestClient) {
  return bodyOf(await dashboardGet(client, '/api/learning'), 200, enrolmentListSchema);
}

describe('the dashboard', () => {
  it('is empty for a newly signed-in learner', async () => {
    const list = await readDashboard(learner);
    expect(list.enrolments).toEqual([]);
  });

  it('lists a course once it is paid, with the progress made', async () => {
    await buyCourse(learner, COURSE_ID);
    await learner.post(`/api/learning/courses/${COURSE_ID}/lessons/how-it-works/complete`);
    const list = await readDashboard(learner);
    expect(list.enrolments).toEqual([
      expect.objectContaining({
        courseId: COURSE_ID,
        status: 'active',
        lessonsCompleted: 1,
        lessons: course.lessons.length,
        quizPassed: false,
        completedAt: null,
        certificateId: null,
      }),
    ]);
  });

  it('leaves out a refunded course', async () => {
    const { orderId } = await buyCourse(learner, COURSE_ID);
    expect((await learner.post(`/api/payments/${orderId}/refund`)).status).toBe(200);
    const list = await readDashboard(learner);
    expect(list.enrolments).toEqual([]);
  });
});

describe('a course', () => {
  it('needs a session', async () => {
    await expectProblem(await learner.get(`/api/learning/courses/${COURSE_ID}`), 401, 'no_session');
    await expectProblem(
      await learner.post(`/api/learning/courses/${COURSE_ID}/quiz`, { answers: [] }),
      401,
      'no_session',
    );
    await expectProblem(await askCertificate('Ada Lovelace'), 401, 'no_session');
    await expectProblem(
      await learner.post(`/api/learning/courses/${COURSE_ID}/lessons/how-it-works/complete`),
      401,
      'no_session',
    );
  });

  it('does not exist for a learner who has not paid for it', async () => {
    await buyCourse(learner, 'ai-for-office-work');
    await expectProblem(await learner.get(`/api/learning/courses/${COURSE_ID}`), 404, 'not_found');
  });

  it('is closed again after a refund', async () => {
    const { orderId } = await buyCourse(learner, COURSE_ID);
    await learner.post(`/api/payments/${orderId}/refund`);
    await expectProblem(await learner.get(`/api/learning/courses/${COURSE_ID}`), 404, 'not_found');
  });

  it('shows its questions without the answers', async () => {
    await buyCourse(learner, COURSE_ID);
    const response = await learner.get(`/api/learning/courses/${COURSE_ID}`);
    const text = await response.clone().text();
    const content = await bodyOf(response, 200, courseContentSchema);
    expect(content.quiz.questions).toHaveLength(course.quiz.questions.length);
    expect(text).not.toContain('correctOption');
    expect(text).not.toContain('explanation');
    expect(content.status).toBe('active');
    expect(content.lessons.every((lesson) => !lesson.completed)).toBe(true);
  });

  it('gives no practice tasks to a learner without an occupation', async () => {
    await buyCourse(learner, COURSE_ID);
    expect((await contentOf()).practice.tasks).toEqual([]);
  });

  it('practises on the most exposed tasks of the learner, without those they do not do', async () => {
    const report = await bodyOf(
      await learner.get('/api/unit-groups/4313'),
      200,
      exposureReportSchema,
    );
    const taskIds = report.tasks.map((task) => task.id);
    const [first, second, third, fourth] = taskIds;
    await bodyOf(
      await learner.put('/api/session/profile', {
        region: 'us',
        occupation: PAYROLL_CLERK,
        timeByTask: { [first ?? '']: 'none' },
      }),
      200,
      sessionSchema,
    );
    await buyCourse(learner, COURSE_ID);
    const tasks = (await contentOf()).practice.tasks.map((task) => task.id);
    expect(tasks).toEqual([second, third, fourth]);
  });
});

describe('lessons', () => {
  it('are marked as done, and marking one twice changes nothing', async () => {
    await buyCourse(learner, COURSE_ID);
    const lessonPath = `/api/learning/courses/${COURSE_ID}/lessons/how-it-works/complete`;
    expect((await learner.post(lessonPath)).status).toBe(204);
    expect((await learner.post(lessonPath)).status).toBe(204);
    const rows = await api.database.execute('SELECT lesson_id FROM lesson_progress');
    expect(rows.rows).toHaveLength(1);
    const lessons = (await contentOf()).lessons;
    expect(lessons.filter((lesson) => lesson.completed).map((lesson) => lesson.id)).toEqual([
      'how-it-works',
    ]);
  });

  it('must belong to the course', async () => {
    await buyCourse(learner, COURSE_ID);
    await expectProblem(
      await learner.post(`/api/learning/courses/${COURSE_ID}/lessons/correspondence/complete`),
      404,
      'not_found',
    );
  });
});

describe('the quiz', () => {
  beforeEach(async () => {
    await buyCourse(learner, COURSE_ID);
  });

  it('cannot be taken before every lesson is done', async () => {
    await expectProblem(
      await learner.post(`/api/learning/courses/${COURSE_ID}/quiz`, { answers: rightAnswers }),
      409,
      'lessons_incomplete',
    );
  });

  it('needs one answer per question, each naming an existing option', async () => {
    await completeEveryLesson();
    const quizPath = `/api/learning/courses/${COURSE_ID}/quiz`;
    await expectProblem(await learner.post(quizPath, { answers: [0] }), 400, 'invalid_input');
    const outOfRange = rightAnswers.map((answer, position) => (position === 0 ? 9 : answer));
    const problem = await expectProblem(
      await learner.post(quizPath, { answers: outOfRange }),
      400,
      'invalid_input',
    );
    expect(problem.issues).toEqual([{ path: 'answers.0', message: anyString }]);
  });

  it('is marked on the server, and a pass completes the course', async () => {
    await completeEveryLesson();
    const result = await takeQuiz(rightAnswers);
    expect(result).toMatchObject({ passed: true, correct: rightAnswers.length });
    expect(result.questions.every((question) => question.correct)).toBe(true);
    const content = await contentOf();
    expect(content.status).toBe('completed');
    expect(content.quiz.passed).toBe(true);
  });

  it('can be failed and taken again', async () => {
    await completeEveryLesson();
    const failed = await takeQuiz(wrongAnswers);
    expect(failed).toMatchObject({ passed: false, correct: 0 });
    expect(failed.questions[0]?.explanation).toBe(course.quiz.questions[0]?.explanation);
    expect((await contentOf()).status).toBe('active');
    expect((await takeQuiz(rightAnswers)).passed).toBe(true);
  });

  it('leaves a completed course completed when a later attempt fails', async () => {
    await completeEveryLesson();
    await takeQuiz(rightAnswers);
    const dashboard = await readDashboard(learner);
    await takeQuiz(wrongAnswers);
    const content = await contentOf();
    expect(content.status).toBe('completed');
    expect(content.quiz.passed).toBe(true);
    expect(await readDashboard(learner)).toEqual(dashboard);
  });

  it('closes the refund once the course is completed', async () => {
    const { payments } = await bodyOf(
      await dashboardGet(learner, '/api/payments'),
      200,
      paymentListSchema,
    );
    await completeEveryLesson();
    await takeQuiz(rightAnswers);
    await expectProblem(
      await learner.post(`/api/payments/${payments[0]?.orderId ?? ''}/refund`),
      409,
      'refund_not_allowed',
    );
  });
});

describe('the certificate', () => {
  beforeEach(async () => {
    await buyCourse(learner, COURSE_ID);
  });

  it('is earned only by completing the course', async () => {
    await expectProblem(await askCertificate('Ada Lovelace'), 409, 'course_not_completed');
  });

  it('is issued once, keeps its first name, and anyone can verify it', async () => {
    await completeEveryLesson();
    await takeQuiz(rightAnswers);

    const issued = await bodyOf(await askCertificate('Ada Lovelace'), 201, certificateSchema);
    expect(issued).toEqual({
      id: matching(/^RWR-[2-9A-HJKMNP-Z]{4}-[2-9A-HJKMNP-Z]{4}$/),
      learnerName: 'Ada Lovelace',
      courseTitle: course.title,
      hours: course.hours,
      issuedOn: '2026-11-11',
      demo: true,
    });

    const again = await bodyOf(await askCertificate('Someone Else'), 200, certificateSchema);
    expect(again).toEqual(issued);

    const session = await bodyOf(await learner.get('/api/session'), 200, sessionSchema);
    expect(session.certificateName).toBe('Ada Lovelace');

    const content = await contentOf();
    expect(content.certificateId).toBe(issued.id);

    const stranger = api.client();
    const verified = await bodyOf(
      await stranger.get(`/api/certificates/${issued.id.toLowerCase()}`),
      200,
      certificateSchema,
    );
    expect(verified).toEqual(issued);
    expect(stranger.cookie).toBeUndefined();
  });

  it('cannot be verified with an id nobody was given', async () => {
    await expectProblem(await learner.get('/api/certificates/RWR-2222-2222'), 404, 'not_found');
  });

  it('rejects a name that is too short', async () => {
    await completeEveryLesson();
    await takeQuiz(rightAnswers);
    await expectProblem(await askCertificate(' A '), 400, 'invalid_input');
  });
});

describe('certificate ids', () => {
  it('are drawn again when the first one is already taken', async () => {
    await api.close();
    const ids = ['RWR-AAAA-AAAA', 'RWR-AAAA-AAAA', 'RWR-BBBB-BBBB'];
    api = await createTestApi({
      overrides: { newCertificateId: () => ids.shift() ?? 'RWR-ZZZZ-ZZZZ' },
    });
    const first = api.client();
    const second = api.client();
    for (const client of [first, second]) {
      await buyCourse(client, COURSE_ID);
      await completeEveryLesson(client);
      await takeQuiz(rightAnswers, client);
    }
    const one = await bodyOf(await askCertificate('First Learner', first), 201, certificateSchema);
    const two = await bodyOf(
      await askCertificate('Second Learner', second),
      201,
      certificateSchema,
    );
    expect([one.id, two.id]).toEqual(['RWR-AAAA-AAAA', 'RWR-BBBB-BBBB']);
  });
});
