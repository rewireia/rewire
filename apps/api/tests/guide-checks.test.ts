import {
  exposureReportSchema,
  guideReplySchema,
  interpretResultSchema,
  type GuideCard,
} from '@rewire/contracts';
import { afterEach, describe, expect, it } from 'vitest';

import { jobLossClaimsIn } from '../src/modules/guide/claims.ts';

import { bodyOf, type TestClient } from './support/client.ts';
import { createScriptedModel, type Script, type ScriptedModel } from './support/scripted-model.ts';
import { createTestApi, expectProblem, type TestApi } from './support/test-api.ts';

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

const converse = async (client: TestClient, text: string, lang = 'en') =>
  bodyOf(
    await client.post('/api/guide/messages', {
      messages: [{ role: 'user', text }],
      region: 'us',
      isco08: '4313',
      lang,
    }),
    200,
    guideReplySchema,
  );

const cardsOf = (cards: readonly GuideCard[]) => cards.map((card) => card.type);

/** A model that answers each request in turn with the next text, after reading the report. */
const answering =
  (...texts: string[]): Script =>
  async ({ call, toolNames }) => {
    if (toolNames.includes('read_exposure_report')) {
      await call('read_exposure_report', { isco08: '4313' });
    }
    return texts[model.requests.length - 1] ?? '';
  };

describe('what the guide says in a conversation', () => {
  it('speaks in words, and the report it read is a card with the engine’s figures', async () => {
    const client = await start(async ({ call }) => {
      await call('read_exposure_report', { isco08: '4313' });
      return 'Your report is below: your occupation is among the more exposed.';
    });
    const reply = await converse(client, 'I have 2 hours a week. How exposed am I?');
    expect(reply.text).toBe('Your report is below: your occupation is among the more exposed.');
    expect(model.requests).toHaveLength(1);
    const report = await bodyOf(
      await client.get('/api/unit-groups/4313'),
      200,
      exposureReportSchema,
    );
    const { title, meanScore, gradient, standing } = report;
    expect(reply.cards).toEqual([
      { type: 'report', isco08: '4313', title, meanScore, gradient, standing },
    ]);
  });

  it('repeats no figure, not even one the person wrote', async () => {
    const client = await start(
      answering('You said you have 2 hours a week.', 'You told me how much time you have.'),
    );
    const reply = await converse(client, 'I have 2 hours a week.');
    expect(reply.text).toBe('You told me how much time you have.');
    expect(model.requests[1]?.turns.at(-1)?.text).toContain('It writes figures: 2.');
  });

  it('points at no task by its tag, which a conversation has no report to draw', async () => {
    const client = await start(answering('Look at [T1].', 'Look at your most exposed task.'));
    const reply = await converse(client, 'What stands out?');
    expect(reply.text).toBe('Look at your most exposed task.');
  });

  it('is written again, without tools, when it holds a figure nothing gave the model', async () => {
    const client = await start(
      answering('Your exposure is 999999 percent.', 'Your report is shown below.'),
    );
    const reply = await converse(client, 'Explain my exposure');

    expect(reply.text).toBe('Your report is shown below.');
    expect(cardsOf(reply.cards)).toEqual(['report']);
    const [, second] = model.requests;
    // Nothing a tool did may happen twice: the second attempt has none to call.
    expect(second?.tools).toEqual([]);
    expect(second?.turns.at(-1)?.text).toContain('999999');
    expect(second?.turns.at(-1)?.text).toContain('What your tools returned:');
    expect(model.toolAnswers).toHaveLength(1);
  });

  it('shows none of the model’s words when it fails twice, and keeps what the tools found', async () => {
    const client = await start(
      answering('Your exposure is 999999 percent.', 'It is 999998 percent, then.'),
    );
    const english = await converse(client, 'Explain my exposure');
    expect(english.text).toContain('I could not put this into words');
    expect(english.text).not.toContain('99999');
    expect(cardsOf(english.cards)).toEqual(['report']);
    expect(model.requests).toHaveLength(2);
  });

  it('answers its refusal in the language of the person', async () => {
    const client = await start(() => 'Ninety-nine percent of your job will disappear.');
    const reply = await converse(client, 'Explícame mi exposición', 'es');
    expect(reply.text).toContain('No he podido decirlo');
  });

  it('never says a job will be lost, even with a figure that is in the report', async () => {
    const client = await start(
      answering(
        'You have a 100 percent chance of losing your job.',
        'The scores measure technical potential, not job loss.',
      ),
    );
    const reply = await converse(client, 'Will I lose my job? The scale goes to 100.');
    expect(reply.text).toBe('The scores measure technical potential, not job loss.');
  });

  it('counts against the budget the answers it discards too', async () => {
    const client = await start(
      answering('Your exposure is 999999 percent.', 'It is 999998 percent, then.'),
      // Room for a call's limit and the two answers of 100 tokens, not for a third call.
      { GUIDE_DAILY_TOKEN_BUDGET: String(GUIDE_TOKENS_PER_CALL + 150) },
    );
    // Two answers of 100 tokens each were asked for, and none was shown.
    await converse(client, 'Explain my exposure');
    await expectProblem(
      await client.post('/api/guide/messages', {
        messages: [{ role: 'user', text: 'And now?' }],
        region: 'us',
      }),
      429,
      'guide_budget_spent',
    );
  });
});

describe('the note of an interpreted description', () => {
  it('is left out when it fails the checks, and the occupations stay', async () => {
    const client = await start(async ({ call, toolNames }) => {
      if (toolNames.length > 0) {
        await call('search_occupations', { query: 'payroll clerk' });
        await call('propose_occupations', { choices: [{ code: '43-3051.00', isco08: '4313' }] });
      }
      return 'This fits 87 percent of what you do.';
    });
    const result = await bodyOf(
      await client.post('/api/regions/us/occupations/interpret', {
        text: 'I sort out wages and do spreadsheets for the boss',
      }),
      200,
      interpretResultSchema,
    );
    expect(result).toMatchObject({ source: 'ai', note: null });
    expect(result.matches[0]?.occupation.code).toBe('43-3051.00');
  });
});

describe('the explanation of a report', () => {
  it('is refused when it says a job will be lost, though its figure and its tag are right', async () => {
    const client = await start(() => 'You have a 100 percent chance of losing your job. [T1]');
    await expectProblem(
      await client.post('/api/unit-groups/4313/explanation', { region: 'us' }),
      502,
      'explanation_failed_check',
    );
    expect(model.requests).toHaveLength(2);
    expect(model.requests[1]?.turns[0]?.text).toContain('Sentences that say a job will be lost');
    expect(model.requests[1]?.turns[0]?.text).toContain('must not: 100.');
  });
});

describe('the claim that a job will be lost', () => {
  it('is found in a sentence that makes it, in English and Spanish', () => {
    expect(jobLossClaimsIn('Your score is high. You will lose your job soon.')).toEqual([
      'You will lose your job soon.',
    ]);
    expect(jobLossClaimsIn('Your job will disappear.')).toHaveLength(1);
    expect(jobLossClaimsIn('You will be replaced within a year.')).toHaveLength(1);
    expect(jobLossClaimsIn('Vas a perder tu trabajo.')).toHaveLength(1);
    expect(jobLossClaimsIn('Tu puesto va a desaparecer.')).toHaveLength(1);
  });

  it('is not found in a sentence that denies it', () => {
    for (const sentence of [
      'These scores describe technical potential, not job loss.',
      'They do not predict that anyone will lose their job.',
      'A high score doesn’t mean your job will disappear.',
      'No predicen una pérdida de empleo.',
      'Las notas no dicen nada sobre perder tu trabajo.',
      'Miden el potencial técnico, nunca que vayas a perder tu empleo.',
    ]) {
      expect(jobLossClaimsIn(sentence), sentence).toEqual([]);
    }
  });

  it('is not found in a text about the tasks of a job', () => {
    expect(
      jobLossClaimsIn('Verifying attendance is your most exposed task, with a score of 70.'),
    ).toEqual([]);
  });
});
