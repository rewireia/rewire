import { enrolmentListSchema, guideReplySchema, roadmapSchema } from '@rewire/contracts';
import { afterEach, describe, expect, it } from 'vitest';

import { bodyOf, dashboardGet } from './support/client.ts';
import { createFakeInvoicing } from './support/fake-invoicing.ts';
import { createScriptedModel, type Script, type ScriptedModel } from './support/scripted-model.ts';
import { buyCourse, createTestApi, expectProblem, type TestApi } from './support/test-api.ts';

/** A listed course: real, at its provider, with no hours stated there. */
const NO_HOURS_ID = 'elements-of-ai-introduction';
const LISTED_ID = 'mslearn-sc-200t00';

let api: TestApi | undefined;

afterEach(async () => {
  await api?.close();
  api = undefined;
});

describe('a listed course in the learner’s own lists', () => {
  it('appears among the learner’s courses, taken at its provider', async () => {
    api = await createTestApi({ overrides: { model: null } });
    const client = api.client();
    await buyCourse(client, LISTED_ID);
    await buyCourse(client, 'ai-foundations');
    const { enrolments } = await bodyOf(
      await dashboardGet(client, '/api/learning'),
      200,
      enrolmentListSchema,
    );
    const listed = enrolments.find((line) => line.courseId === LISTED_ID);
    expect(listed).toMatchObject({
      kind: 'listed',
      provider: 'Microsoft Learn',
      stage: null,
      lessons: null,
      lessonsCompleted: null,
      certificateId: null,
      status: 'active',
    });
    expect(enrolments.find((line) => line.courseId === 'ai-foundations')).toMatchObject({
      kind: 'hosted',
      provider: null,
      url: null,
      stage: 'understand',
    });
  });

  it('keeps the hours of the roadmap null when the provider states none', async () => {
    api = await createTestApi({ overrides: { model: null } });
    const client = api.client();
    await buyCourse(client, NO_HOURS_ID);
    const { courses } = await bodyOf(
      await dashboardGet(client, '/api/marketplace/roadmap?region=us&language=en'),
      200,
      roadmapSchema,
    );
    expect(courses.find((course) => course.courseId === NO_HOURS_ID)?.hours).toBeNull();
  });
});

describe('what is not offered for a listed course', () => {
  it('refuses an employer invoice with the usual 404, and sends nothing', async () => {
    const invoicing = createFakeInvoicing();
    api = await createTestApi({ overrides: { model: null, invoicing: { us: invoicing } } });
    const learner = api.client();
    // A session of its own, as a learner who already bought a hosted course has.
    await buyCourse(learner, 'ai-foundations');
    const response = await learner.post('/api/sponsorships', {
      courseId: LISTED_ID,
      region: 'us',
      employerEmail: 'employer@example.com',
      employerName: 'Employer Ltd',
    });
    const problem = await expectProblem(response, 404, 'not_found');
    expect(problem.detail).toBe('That course does not exist.');
    expect(invoicing.calls.sent).toBe(0);
  });

  it('opens no order when the guide is asked to buy one', async () => {
    const script: Script = async ({ call }) => {
      await call('prepare_course_purchase', { courseId: LISTED_ID });
      return 'That course cannot be bought here.';
    };
    const model: ScriptedModel = createScriptedModel(script);
    api = await createTestApi({ overrides: { model } });
    const client = api.client();
    const reply = await bodyOf(
      await client.post('/api/guide/messages', {
        messages: [{ role: 'user', text: 'Buy it' }],
        region: 'us',
        isco08: '4313',
      }),
      200,
      guideReplySchema,
    );
    expect(reply.cards).toEqual([]);
    expect(api.gateway.calls.opened).toBe(0);
    expect(model.toolAnswers.at(-1)?.answer).toMatch(/^No paid course has that id/);
  });
});
