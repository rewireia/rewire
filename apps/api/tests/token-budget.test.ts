import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { HttpProblem } from '../src/http/problem.ts';
import { GuideModelError, SpentBeforeFailing } from '../src/modules/guide/model.ts';
import { createOpenAiModel } from '../src/modules/guide/openai-model.ts';
import { createTokenBudget, meteredBy, withinBudget } from '../src/modules/guide/token-budget.ts';
import type { Fetch } from '../src/platform/fetch.ts';

import { createTestClock } from './support/test-api.ts';

const limits = (dailyTokens: number, tokensPerCall = 20, concurrentCalls = 4) => ({
  dailyTokens,
  tokensPerCall,
  concurrentCalls,
});

const spentProblem: unknown = expect.objectContaining({ status: 429, code: 'guide_budget_spent' });
const ask = { system: '', turns: [], tools: [] };

describe('the daily token budget', () => {
  it('admits a call only while the day has room for its whole limit', () => {
    const budget = createTokenBudget(limits(100), createTestClock());
    budget.reserve().settle(79);
    budget.reserve().settle(1);
    expect(() => budget.reserve()).not.toThrow();
    const full = createTokenBudget(limits(100), createTestClock());
    full.reserve().settle(81);
    expect(() => full.reserve()).toThrow(spentProblem);
  });

  it('refuses with a problem the person can read', () => {
    const budget = createTokenBudget(limits(1), createTestClock());
    budget.reserve().settle(5);
    expect(() => budget.reserve()).toThrow(HttpProblem);
  });

  it('starts again on a new day', () => {
    const clock = createTestClock();
    const budget = createTokenBudget(limits(10), clock);
    budget.reserve().settle(10);
    clock.advanceDays(1);
    expect(() => budget.reserve()).not.toThrow();
  });

  it('counts what is set aside, so calls at the same time cannot all fit in what is left', () => {
    const budget = createTokenBudget(limits(50), createTestClock());
    budget.reserve();
    budget.reserve();
    expect(() => budget.reserve()).toThrow(spentProblem);
  });

  it('gives a call the day as its limit when the day is smaller than a call', () => {
    const budget = createTokenBudget(limits(10, 20_000), createTestClock());
    expect(budget.reserve().tokens).toBe(10);
    expect(() => budget.reserve()).toThrow(spentProblem);
  });

  it('settles a reservation with what the call spent, and only once', () => {
    const budget = createTokenBudget(limits(100), createTestClock());
    const first = budget.reserve();
    first.settle(10);
    first.settle(10);
    first.release();
    budget.reserve().settle(70);
    expect(() => budget.reserve()).not.toThrow();
  });

  it('runs no more calls at once than it allows, and says it is busy', () => {
    const budget = createTokenBudget(limits(1_000_000, 20, 2), createTestClock());
    const first = budget.reserve();
    budget.reserve();
    expect(() => budget.reserve()).toThrow(
      expect.objectContaining({ status: 429, code: 'guide_busy' }),
    );
    first.settle(10);
    expect(() => budget.reserve()).not.toThrow();
  });
});

describe('a call within the budget', () => {
  it('is handed its limit', async () => {
    const budget = createTokenBudget(limits(100, 30), createTestClock());
    expect(
      await withinBudget(
        budget,
        (tokenLimit) => Promise.resolve(tokenLimit),
        () => 1,
      ),
    ).toBe(30);
  });

  it('gives back what it set aside when it fails having spent nothing known', async () => {
    const budget = createTokenBudget(limits(20), createTestClock());
    const failing = () => Promise.reject(new Error('no answer'));
    await expect(withinBudget(budget, failing, () => 20)).rejects.toThrow('no answer');
    await expect(withinBudget(budget, failing, () => 20)).rejects.toThrow('no answer');
    expect(() => budget.reserve()).not.toThrow();
  });

  it('counts what a failed call had spent, as its failure says', async () => {
    const budget = createTokenBudget(limits(100), createTestClock());
    const cutOff = () => Promise.reject(new GuideModelError('truncated', { tokensSpent: 90 }));
    await expect(withinBudget(budget, cutOff, () => 0)).rejects.toThrow(GuideModelError);
    expect(() => budget.reserve()).toThrow(spentProblem);
  });

  it('counts what was spent before Rewire’s own code failed, and lets that failure go on', async () => {
    const budget = createTokenBudget(limits(100), createTestClock());
    const bug = new TypeError('a tool broke');
    const failing = () => Promise.reject(new SpentBeforeFailing(90, bug));
    await expect(withinBudget(budget, failing, () => 0)).rejects.toBe(bug);
    expect(() => budget.reserve()).toThrow(spentProblem);
  });
});

/** OpenAI in memory: every answer spends `input` tokens in and all the output it was allowed. */
function openAiSpendingAll(input: number, status = 'completed') {
  const allowed: number[] = [];
  const fetcher: Fetch = async (_url, init) => {
    const body = z
      .object({ max_output_tokens: z.number() })
      .parse(JSON.parse(typeof init.body === 'string' ? init.body : '{}'));
    allowed.push(body.max_output_tokens);
    await new Promise((resolve) => setTimeout(resolve, 5));
    return Response.json({
      status,
      output: [{ type: 'message', content: [{ type: 'output_text', text: 'ok' }] }],
      usage: { input_tokens: input, output_tokens: body.max_output_tokens },
    });
  };
  return { fetcher, allowed };
}

const openAiModel = (fetcher: Fetch) =>
  createOpenAiModel({ apiKey: 'test-key', model: 'test-model', effort: 'low' }, fetcher);

describe('a metered model', () => {
  it('admits one of twenty calls made at once when the day has room for one', async () => {
    const budget = createTokenBudget(limits(100, 20_000), createTestClock());
    let calls = 0;
    const metered = meteredBy(budget, {
      async complete() {
        calls += 1;
        await new Promise((resolve) => setTimeout(resolve, 5));
        return { text: 'ok', tokens: 100 };
      },
    });
    const answers = await Promise.allSettled(
      Array.from({ length: 20 }, () => metered.complete(ask)),
    );
    expect(calls).toBe(1);
    expect(answers.filter((answer) => answer.status === 'fulfilled')).toHaveLength(1);
    const refusals: unknown[] = answers.flatMap((answer) =>
      answer.status === 'rejected' ? [answer.reason as unknown] : [],
    );
    expect(refusals).toEqual(Array.from({ length: 19 }, () => spentProblem));
    expect(() => budget.reserve()).toThrow(spentProblem);
  });

  it('counts the answers cut off, as the reviewer reproduced them (failed_usage)', async () => {
    const budget = createTokenBudget(limits(100), createTestClock());
    let networkCalls = 0;
    const metered = meteredBy(
      budget,
      openAiModel(() => {
        networkCalls += 1;
        return Promise.resolve(
          Response.json({
            status: 'incomplete',
            output: [],
            usage: { input_tokens: 100, output_tokens: 10 },
          }),
        );
      }),
    );
    await expect(metered.complete(ask)).rejects.toThrow(GuideModelError);
    await expect(metered.complete(ask)).rejects.toThrow(spentProblem);
    await expect(metered.complete(ask)).rejects.toThrow(spentProblem);
    expect(networkCalls).toBe(1);
  });

  it('keeps calls at once within the day, up to their input (concurrent_overspend)', async () => {
    const budget = createTokenBudget(limits(100), createTestClock());
    const openai = openAiSpendingAll(5);
    const metered = meteredBy(budget, openAiModel(openai.fetcher));
    const answers = await Promise.allSettled(
      Array.from({ length: 4 }, () => metered.complete(ask)),
    );
    const spent = answers.flatMap((answer) =>
      answer.status === 'fulfilled' ? [answer.value.tokens] : [],
    );
    expect(openai.allowed).toEqual([20, 20, 20, 20]);
    // Four calls of 20 at most, each above it by its input of 5 at most.
    expect(spent.reduce((sum, tokens) => sum + tokens, 0)).toBeLessThanOrEqual(100 + 4 * 5);
    expect(() => budget.reserve()).toThrow(spentProblem);
  });

  it('counts a burst of answers cut off one by one, and stops when the day is spent', async () => {
    const budget = createTokenBudget(limits(200, 50), createTestClock());
    const openai = openAiSpendingAll(10, 'incomplete');
    const metered = meteredBy(budget, openAiModel(openai.fetcher));
    const answers = await Promise.allSettled(
      Array.from({ length: 8 }, () => metered.complete(ask)),
    );
    expect(openai.allowed).toEqual([50, 50, 50, 50]);
    expect(answers.filter((answer) => answer.status === 'rejected')).toHaveLength(8);
    expect(() => budget.reserve()).toThrow(spentProblem);
  });
});
