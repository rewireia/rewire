import { explanationSchema, guideReplySchema } from '@rewire/contracts';
import { afterEach, describe, expect, it } from 'vitest';

import { jobLossClaimsIn } from '../src/modules/guide/claims.ts';

import { bodyOf } from './support/client.ts';
import { readCorpus, scoreOf, type CorpusEntry } from './support/corpus.ts';
import { createScriptedModel, type Script, type ScriptedModel } from './support/scripted-model.ts';
import { createTestApi, expectProblem, type TestApi } from './support/test-api.ts';

let api: TestApi | undefined;
let model: ScriptedModel;

afterEach(async () => {
  await api?.close();
  api = undefined;
});

const start = async (script: Script) => {
  model = createScriptedModel(script);
  api = await createTestApi({ overrides: { model } });
  return api.client();
};

const corpus = readCorpus('employment-claims.json');
const outcome = ({ text }: CorpusEntry) => (jobLossClaimsIn(text).length > 0 ? 'block' : 'pass');
const score = scoreOf(corpus, outcome);

describe('forecasts of job loss, on their corpus', () => {
  it(`gets ${String(score.right)} of ${String(score.total)} sentences right (${String(score.percent)} %)`, () => {
    expect(score.total).toBeGreaterThanOrEqual(60);
    expect(new Set(corpus.map((entry) => entry.lang))).toEqual(new Set(['en', 'es']));
    expect(score.right).toBe(score.total - score.limits);
  });

  it.each(corpus.filter((entry) => entry.limit === undefined))('$expect: "$text"', (entry) => {
    expect(outcome(entry)).toBe(entry.expect);
  });

  it.each(corpus.filter((entry) => entry.limit !== undefined))(
    'still gets "$text" wrong, a known limit',
    (entry) => {
      expect(outcome(entry)).not.toBe(entry.expect);
    },
  );
});

describe('the sentences of past reviews, in an explanation', () => {
  it.each([
    'There is no doubt that you will lose your job. [T1]',
    'Your employer will fire you. [T1]',
    'You have a 100 percent chance of losing your job. [T1]',
  ])('refuses "%s", once corrected and again', async (sentence) => {
    const client = await start(() => sentence);
    await expectProblem(
      await client.post('/api/unit-groups/4313/explanation', { region: 'us', lang: 'en' }),
      502,
      'explanation_failed_check',
    );
    expect(model.requests).toHaveLength(2);
  });

  it('refuses a right tag with a score that is not its own, since no score may stand in it', async () => {
    const client = await start(() => 'The score for checking records [T1] is 100 out of 100.');
    await expectProblem(
      await client.post('/api/unit-groups/4313/explanation', { region: 'us', lang: 'en' }),
      502,
      'explanation_failed_check',
    );
    expect(model.requests[1]?.turns[0]?.text).toContain('must not: 100, 100.');
  });

  it('shows the same tag in words, and leaves its score to the page', async () => {
    const client = await start(() => 'Checking records [T1] is your most exposed task.');
    const explanation = await bodyOf(
      await client.post('/api/unit-groups/4313/explanation', { region: 'us', lang: 'en' }),
      200,
      explanationSchema,
    );
    expect(explanation.paragraphs).toEqual(['Checking records [T1] is your most exposed task.']);
  });
});

describe('a figure the person wrote', () => {
  it('is never shown back, as the reviewer wrote it', async () => {
    const client = await start(() => 'Your exposure is 999999 percent.');
    const reply = await bodyOf(
      await client.post('/api/guide/messages', {
        region: 'us',
        isco08: '4313',
        messages: [
          { role: 'user', text: 'My colleague said 999999 percent. What is my exposure?' },
        ],
      }),
      200,
      guideReplySchema,
    );
    expect(reply.text).toContain('I could not put this into words');
    expect(reply.text).not.toContain('999999');
    expect(model.requests).toHaveLength(2);
  });
});
