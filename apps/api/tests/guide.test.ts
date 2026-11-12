import {
  explanationSchema,
  exposureReportSchema,
  guideStatusSchema,
  interpretResultSchema,
} from '@rewire/contracts';
import { afterEach, describe, expect, it } from 'vitest';

import { GuideModelError } from '../src/modules/guide/model.ts';

import { bodyOf, type TestClient } from './support/client.ts';
import { createScriptedModel, type Script, type ScriptedModel } from './support/scripted-model.ts';
import { createTestApi, expectProblem, type TestApi } from './support/test-api.ts';

/** Says nothing the plain search can match, so the model is asked. */
const VAGUE = 'I sort out wages and do spreadsheets for the boss';
const PAYROLL = { code: '43-3051.00', isco08: '4313' };
/** What the server sets aside for each call of the guide. */
const GUIDE_TOKENS_PER_CALL = 40_000;

let api: TestApi;
let model: ScriptedModel;

afterEach(async () => {
  await api.close();
});

const start = async (script: Script, environment?: Record<string, string>) => {
  model = createScriptedModel(script);
  api = await createTestApi({ overrides: { model }, ...(environment ? { environment } : {}) });
  return api.client();
};

const interpret = (client: TestClient, text: string) =>
  client.post('/api/regions/us/occupations/interpret', { text });

const explain = (client: TestClient) =>
  client.post('/api/unit-groups/4313/explanation', { region: 'us' });

const converse = (client: TestClient, text: string) =>
  client.post('/api/guide/messages', {
    messages: [{ role: 'user', text }],
    region: 'us',
    isco08: '4313',
  });

/** The facts the explanation is written from, as the model receives them. */
const factsOf = (turn: Parameters<Script>[0]) => turn.request.turns[0]?.text ?? '';
const meanOf = (facts: string) => /Mean score of the occupation, 0 to 100: (\d+)/.exec(facts)?.[1];

describe('the guide without a model', () => {
  it('says it is off, and interpreting falls back to the plain search', async () => {
    api = await createTestApi();
    const client = api.client();
    expect(await bodyOf(await client.get('/api/guide/status'), 200, guideStatusSchema)).toEqual({
      available: false,
      provider: null,
      usedToImproveModels: false,
    });
    const result = await bodyOf(
      await interpret(client, 'payroll clerk'),
      200,
      interpretResultSchema,
    );
    expect(result.source).toBe('search');
    expect(result.matches[0]?.occupation.code).toBe(PAYROLL.code);
  });

  it('answers 503 to the explanation and the conversation', async () => {
    api = await createTestApi();
    const client = api.client();
    await expectProblem(await explain(client), 503, 'guide_unavailable');
    await expectProblem(await converse(client, 'Hello'), 503, 'guide_unavailable');
  });
});

describe('where the words of a person go', () => {
  it('is said before they write any: who answers, and whether it may learn from them', async () => {
    api = await createTestApi({
      environment: { OPENAI_API_KEY: 'test-key', GUIDE_PROVIDER_TRAINS_ON_DATA: 'true' },
    });
    const status = await bodyOf(
      await api.client().get('/api/guide/status'),
      200,
      guideStatusSchema,
    );
    expect(status).toEqual({ available: true, provider: 'openai', usedToImproveModels: true });
  });
});

describe('interpreting a job description', () => {
  it('does not ask the model when the plain search is already sure', async () => {
    const client = await start(() => 'unused');
    const result = await bodyOf(
      await interpret(client, 'payroll clerk'),
      200,
      interpretResultSchema,
    );
    expect(result.source).toBe('search');
    expect(model.requests).toHaveLength(0);
  });

  it('shows the occupation the model chose among those the search returned', async () => {
    const client = await start(async ({ call }) => {
      await call('search_occupations', { query: 'payroll clerk' });
      await call('propose_occupations', { choices: [PAYROLL] });
      return 'You look after pay.';
    });
    const result = await bodyOf(await interpret(client, VAGUE), 200, interpretResultSchema);
    expect(result).toMatchObject({ source: 'ai', note: 'You look after pay.' });
    expect(result.matches.map((match) => match.occupation.code)).toEqual([PAYROLL.code]);
    expect(result.matches[0]?.unitGroup?.isco08).toBe(PAYROLL.isco08);
  });

  it('falls back to local search if the model fails', async () => {
    const client = await start(() => {
      throw new GuideModelError('truncated');
    });
    const result = await bodyOf(await interpret(client, VAGUE), 200, interpretResultSchema);
    expect(result.source).toBe('search');
  });

  it.each(['empty', 'unavailable'] as const)(
    'keeps a clarification or local fallback when the model is %s',
    async (outcome) => {
      const client = await start(() => {
        if (outcome === 'unavailable') throw new GuideModelError('truncated');
        return 'What are your duties?';
      });
      const result = await bodyOf(
        await interpret(client, 'trabajo en una pizzería\nreparto pedidos'),
        200,
        interpretResultSchema,
      );
      expect(model.requests.length).toBeGreaterThan(0);
      if (outcome === 'unavailable') {
        expect(result.source).toBe('search');
        expect(result.matches.map((match) => match.unitGroup?.isco08)).toContain('9411');
        expect(result.matches.map((match) => match.unitGroup?.isco08)).toContain('5131');
      } else {
        expect(result.source).toBe('ai');
        expect(result.matches).toEqual([]);
      }
      expect(result.note).toContain('?');
    },
  );

  it('passes the original description including its greeting to the model', async () => {
    const client = await start(() => 'What are your main duties?');
    const text = 'Hola, I sort out wages and do spreadsheets for the boss';
    await bodyOf(await interpret(client, text), 200, interpretResultSchema);
    expect(model.requests[0]?.turns[0]?.text).toBe(text);
  });

  it('keeps a checked clarification when the model proposes no occupation', async () => {
    const question = 'What do you do during a typical shift?';
    const client = await start(() => question);
    const result = await bodyOf(await interpret(client, VAGUE), 200, interpretResultSchema);
    expect(result.source).toBe('ai');
    expect(result.note).toBe(question);
    expect(result.matches).toEqual([]);
    expect(model.requests[0]?.reasoningEffort).toBe('low');
  });

  it('does not show an unchecked or non-question answer as a clarification', async () => {
    const client = await start(() => 'You definitely work as a specialist.');
    const result = await bodyOf(await interpret(client, VAGUE), 200, interpretResultSchema);
    expect(result.source).toBe('search');
    expect(result.note).not.toContain('specialist');
  });

  it('refuses a code the model was never shown, which never reaches the person', async () => {
    const client = await start(async ({ call }) => {
      await call('search_occupations', { query: 'payroll clerk' });
      await call('propose_occupations', { choices: [{ code: '15-1252.00', isco08: '2512' }] });
      return 'You write software.';
    });
    const result = await bodyOf(await interpret(client, VAGUE), 200, interpretResultSchema);
    expect(model.toolAnswers.at(-1)?.answer).toMatch(/^Refused/);
    expect(result.source).toBe('search');
    expect(result.matches.map((match) => match.occupation.code)).not.toContain('15-1252.00');
  });
});

describe('explaining a report', () => {
  it('writes from the scores of the report, and shows a text in words with its task tags', async () => {
    const client = await start(
      () => 'Your most exposed task [T1] stands out.\n\nThe rest of your week is less exposed.',
    );
    const explanation = await bodyOf(await explain(client), 200, explanationSchema);
    expect(explanation.paragraphs).toEqual([
      'Your most exposed task [T1] stands out.',
      'The rest of your week is less exposed.',
    ]);
    expect(model.requests).toHaveLength(1);
    const report = await bodyOf(
      await client.get('/api/unit-groups/4313'),
      200,
      exposureReportSchema,
    );
    expect(meanOf(model.requests[0]?.turns[0]?.text ?? '')).toBe(
      String(Math.round(report.meanScore * 100)),
    );
    expect(model.requests[0]?.system).toContain('Write no number at all');
  });

  it('asks again once when it writes a figure, even a true one, and shows the text in words', async () => {
    const client = await start((turn) =>
      model.requests.length === 1
        ? `Your occupation scores ${meanOf(factsOf(turn)) ?? ''}.`
        : 'Your occupation is among the more exposed.',
    );
    const explanation = await bodyOf(await explain(client), 200, explanationSchema);
    expect(explanation.paragraphs).toEqual(['Your occupation is among the more exposed.']);
    expect(model.requests).toHaveLength(2);
    expect(model.requests[1]?.turns[0]?.text).toContain('your words must not:');
  });

  it('refuses a text that makes up a figure twice', async () => {
    const client = await start(() => 'Your occupation scores 999.');
    await expectProblem(await explain(client), 502, 'explanation_failed_check');
    expect(model.requests).toHaveLength(2);
  });

  it('refuses a reference to a task the report does not have', async () => {
    const client = await start(() => 'Your most exposed task is [T9].');
    const report = await bodyOf(
      await client.get('/api/unit-groups/4313'),
      200,
      exposureReportSchema,
    );
    expect(report.tasks.length).toBeLessThan(9);
    await expectProblem(await explain(client), 502, 'explanation_failed_check');
  });

  it.each(['refused', 'truncated'] as const)('answers 502 when the model is %s', async (reason) => {
    const client = await start(() => {
      throw new GuideModelError(reason);
    });
    await expectProblem(await explain(client), 502, `guide_${reason}`);
  });
});

describe('the daily budget', () => {
  it('rests the guide when it is spent, and wakes it the next day', async () => {
    const client = await start(() => 'It is among the more exposed.', {
      // Room for one call's limit, and not for a second after it spent its 100 tokens.
      GUIDE_DAILY_TOKEN_BUDGET: String(GUIDE_TOKENS_PER_CALL + 50),
    });
    await bodyOf(await explain(client), 200, explanationSchema);
    await expectProblem(await explain(client), 429, 'guide_budget_spent');
    api.clock.advanceDays(1);
    await bodyOf(await explain(client), 200, explanationSchema);
  });
});
