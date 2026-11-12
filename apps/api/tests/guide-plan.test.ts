import { guideReplySchema, type GuideCard } from '@rewire/contracts';
import { afterEach, describe, expect, it } from 'vitest';

import { changedPlan } from '../src/modules/guide/plan-tools.ts';

import { bodyOf, type TestClient } from './support/client.ts';
import { createScriptedModel, type Script, type ScriptedModel } from './support/scripted-model.ts';
import {
  courseOf,
  FREE_WITH_HOURS,
  FREE_WITHOUT_HOURS,
  PAID,
  plan,
  readTimeline,
  TODAY,
} from './support/study-plan.ts';
import { createTestApi, type TestApi } from './support/test-api.ts';

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

const converse = async (client: TestClient, text: string) =>
  bodyOf(
    await client.post('/api/guide/messages', {
      messages: [{ role: 'user', text }],
      region: 'us',
      isco08: '4313',
    }),
    200,
    guideReplySchema,
  );

const planCards = (cards: readonly GuideCard[]) =>
  cards.flatMap((card) => (card.type === 'plan' ? [card] : []));

/** What the last tool call told the model: its words hold no figure, the tool's answer does. */
const lastToolAnswer = () => model.toolAnswers.at(-1)?.answer ?? '';

describe('the guide and the plan in time', () => {
  it('reads the plan with its dates, and shows it as a card', async () => {
    const client = await start(async ({ call }) => {
      await call('read_study_plan', { isco08: '4313' });
      return 'Your plan is shown below.';
    });
    const reply = await converse(client, 'When would I finish?');

    const timeline = await readTimeline(client);
    const told = lastToolAnswer();
    expect(told).toContain(`4 hours a week from ${TODAY}; it ends on ${timeline.finishesOn}`);
    expect(told).toContain(`- id ${PAID} | paid demo, payment not made yet |`);
    expect(told).toContain(`- id ${FREE_WITHOUT_HOURS} | free |`);
    expect(told).toContain('length not published');
    expect(reply.text).toBe('Your plan is shown below.');
    expect(planCards(reply.cards)).toEqual([
      {
        type: 'plan',
        isco08: '4313',
        hoursPerWeek: 4,
        startsOn: TODAY,
        finishesOn: timeline.finishesOn,
        changed: false,
      },
    ]);
    // Reading leaves a visitor a visitor.
    expect(client.cookie).toBeUndefined();
  });

  it('changes what the person asks, keeps the rest and saves it as theirs', async () => {
    const client = await start(async ({ call }) => {
      await call('change_study_plan', {
        isco08: '4313',
        hoursPerWeek: 2,
        startsOn: '2027-01-11',
        moves: [{ courseId: PAID, notBefore: '2027-03-01' }],
        leaveOut: [FREE_WITHOUT_HOURS],
      });
      return 'Your plan is changed as you asked.';
    });
    const reply = await converse(client, 'I only have two hours a week, from January.');

    expect(lastToolAnswer()).toContain('The plan was changed.');
    const timeline = await readTimeline(client);
    expect(timeline.saved).toBe(true);
    expect(timeline.plan).toEqual(
      plan({
        hoursPerWeek: 2,
        startsOn: '2027-01-11',
        notBefore: { [PAID]: '2027-03-01' },
        leftOut: [FREE_WITHOUT_HOURS],
      }),
    );
    expect(courseOf(timeline, PAID).booking?.startsOn).toBe('2027-03-01');
    expect(lastToolAnswer()).toContain(`it ends on ${timeline.finishesOn}`);
    expect(planCards(reply.cards)).toEqual([
      {
        type: 'plan',
        isco08: '4313',
        hoursPerWeek: 2,
        startsOn: '2027-01-11',
        finishesOn: timeline.finishesOn,
        changed: true,
      },
    ]);
  });

  it('shows the plan once, as it stands, when an answer reads it and then changes it', async () => {
    const client = await start(async ({ call }) => {
      await call('read_study_plan', { isco08: '4313' });
      await call('change_study_plan', { isco08: '4313', hoursPerWeek: 8 });
      await call('read_study_plan', { isco08: '4313' });
      return 'Your plan is changed as you asked.';
    });
    const reply = await converse(client, 'Make it eight hours a week.');
    const timeline = await readTimeline(client);
    expect(planCards(reply.cards)).toEqual([
      {
        type: 'plan',
        isco08: '4313',
        hoursPerWeek: 8,
        startsOn: TODAY,
        finishesOn: timeline.finishesOn,
        changed: true,
      },
    ]);
  });

  it('tells the model about a change the plan cannot take, and changes nothing', async () => {
    const client = await start(async ({ call }) =>
      call('change_study_plan', {
        isco08: '4313',
        bookings: [{ courseId: FREE_WITH_HOURS, days: 30 }],
      }),
    );
    const reply = await converse(client, 'Give that course a month.');

    expect(reply.text).toContain('The plan was not changed.');
    expect(reply.text).toContain('The length of this course comes from its published hours.');
    expect(planCards(reply.cards)).toEqual([]);
    expect(client.cookie).toBeUndefined();
    expect((await readTimeline(client)).saved).toBe(false);
  });

  it('has no plan to read or change for a group without a score', async () => {
    const client = await start(async ({ call }) =>
      [
        await call('read_study_plan', { isco08: '0000' }),
        await call('change_study_plan', { isco08: '0000', hoursPerWeek: 6 }),
      ].join(' '),
    );
    const reply = await converse(client, 'Change my plan.');
    expect(reply.text).toBe(
      'There is no learning plan for that group. There is no learning plan for that group.',
    );
    expect(client.cookie).toBeUndefined();
  });
});

describe('a change applied to a plan', () => {
  const before = plan({
    hoursPerWeek: 4,
    leftOut: ['a', 'b'],
    notBefore: { c: '2026-12-01', d: '2026-12-15' },
    bookedDays: { e: 10 },
  });

  it('keeps everything the change does not name', () => {
    expect(changedPlan(before, {})).toEqual(before);
    expect(changedPlan(before, { hoursPerWeek: 8 })).toEqual({ ...before, hoursPerWeek: 8 });
  });

  it('leaves courses out and puts them back, each named once', () => {
    expect(changedPlan(before, { leaveOut: ['b', 'f'], putBack: ['a'] }).leftOut).toEqual([
      'b',
      'f',
    ]);
  });

  it('moves a course, and lets one follow the course before it again', () => {
    const moves = [
      { courseId: 'c', notBefore: null },
      { courseId: 'g', notBefore: '2027-02-01' },
    ];
    expect(changedPlan(before, { moves }).notBefore).toEqual({
      d: '2026-12-15',
      g: '2027-02-01',
    });
  });

  it('books days for a course', () => {
    expect(changedPlan(before, { bookings: [{ courseId: 'h', days: 21 }] }).bookedDays).toEqual({
      e: 10,
      h: 21,
    });
  });
});
