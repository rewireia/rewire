import { findDemoCourse, priceOf } from '@rewire/content';
import {
  captureResultSchema,
  enrolmentListSchema,
  guideReplySchema,
  type GuideCard,
} from '@rewire/contracts';
import { afterEach, describe, expect, it } from 'vitest';

import { bodyOf, dashboardGet, type TestClient } from './support/client.ts';
import { createScriptedModel, type Script, type ScriptedModel } from './support/scripted-model.ts';
import { buyCourse, createTestApi, type TestApi } from './support/test-api.ts';

const COURSE_ID = 'ai-for-office-work';

let api: TestApi;
let model: ScriptedModel;

afterEach(async () => {
  await api.close();
});

const start = async (script: Script) => {
  model = createScriptedModel(script);
  api = await createTestApi({ overrides: { model } });
  return api.client();
};

const converse = (client: TestClient, text: string) =>
  client.post('/api/guide/messages', {
    messages: [{ role: 'user', text }],
    region: 'us',
    isco08: '4313',
  });

const cardsOf = (cards: readonly GuideCard[]) => cards.map((card) => card.type);

describe('the conversation', () => {
  it('reads the report and the plan, and shows them as cards', async () => {
    const client = await start(async ({ call }) => {
      await call('read_exposure_report', { isco08: '4313' });
      await call('read_learning_plan', { isco08: '4313' });
      return 'Here is your report and your plan.';
    });
    const reply = await bodyOf(
      await converse(client, 'What should I learn?'),
      200,
      guideReplySchema,
    );
    expect(cardsOf(reply.cards)).toEqual(['report', 'courses']);
    expect(model.requests[0]?.system).toContain('international group 4313');
    expect(client.cookie).toBeUndefined();
  });

  it('prints the words a model stressed without its marks of emphasis', async () => {
    const client = await start(() => 'Start with **Introduction to AI**, which is free.');
    const reply = await bodyOf(await converse(client, 'Where do I start?'), 200, guideReplySchema);
    expect(reply.text).toBe('Start with Introduction to AI, which is free.');
  });

  it('prepares a real order at the catalogue price, and paying it later enrols the learner', async () => {
    const client = await start(async ({ call }) => {
      await call('prepare_course_purchase', { courseId: COURSE_ID });
      return 'Approve the payment in PayPal when you are ready.';
    });
    const reply = await bodyOf(await converse(client, 'I want to buy it'), 200, guideReplySchema);
    const [card] = reply.cards;
    if (card?.type !== 'checkout') {
      throw new Error('the reply has no checkout card');
    }
    const course = findDemoCourse(COURSE_ID);
    expect(card.order.amount).toEqual(course === undefined ? undefined : priceOf(course, 'USD'));
    expect(card.courseTitle).toBe(course?.title);
    expect(api.gateway.calls.opened).toBe(1);
    expect(api.gateway.calls.captured).toBe(0);
    expect(client.cookie).toBeDefined();

    const captured = await bodyOf(
      await client.post(`/api/checkout/orders/${card.order.orderId}/capture`),
      200,
      captureResultSchema,
    );
    expect(captured.status).toBe('completed');
    const learning = await bodyOf(
      await dashboardGet(client, '/api/learning'),
      200,
      enrolmentListSchema,
    );
    expect(learning.enrolments.map((enrolment) => enrolment.courseId)).toEqual([COURSE_ID]);
  });

  it('opens nothing for a course that does not exist', async () => {
    const client = await start(async ({ call }) => {
      await call('prepare_course_purchase', { courseId: 'no-such-course' });
      return 'That course does not exist.';
    });
    const reply = await bodyOf(await converse(client, 'Buy it'), 200, guideReplySchema);
    expect(reply.cards).toEqual([]);
    expect(api.gateway.calls.opened).toBe(0);
    expect(model.toolAnswers.at(-1)?.answer).toMatch(/^No paid course has that id/);
  });

  it('tells the model when the checkout refuses, without failing the conversation', async () => {
    const client = await start(async ({ call }) => {
      await call('prepare_course_purchase', { courseId: COURSE_ID });
      return 'You already have it.';
    });
    await buyCourse(client, COURSE_ID);
    const reply = await bodyOf(await converse(client, 'Buy it again'), 200, guideReplySchema);
    expect(reply.cards).toEqual([]);
    expect(model.toolAnswers.at(-1)?.answer).toBe(
      'No order was opened: You already have this course.',
    );
  });
});
