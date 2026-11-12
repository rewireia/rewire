import { HttpProblem } from '../../http/problem.ts';
import type { Clock } from '../../platform/clock.ts';

import { SpentBeforeFailing, type GuideModel } from './model.ts';

/** How much a model may spend: per day, per call, and at once. */
export interface TokenBudgetLimits {
  /** Tokens per day, in and out. */
  readonly dailyTokens: number;
  /**
   * The most a call may spend, set aside when it starts. The call is told and keeps within it, up
   * to the input of its last round, which is only known once it is answered.
   */
  readonly tokensPerCall: number;
  /** Calls that may be in flight together. */
  readonly concurrentCalls: number;
}

/** The tokens set aside for one call: settled with what it spent, or released if it spent none. */
interface TokenReservation {
  /** The most the call may spend: what was set aside for it. */
  readonly tokens: number;
  settle(tokens: number): void;
  release(): void;
}

/**
 * A ceiling on the tokens a model may spend per day, so a public demo cannot run up an
 * open-ended bill. A call sets its limit aside before it starts, so calls made at the same time
 * see each other: one is admitted only while what was spent, what is set aside and its own limit
 * fit in the day, and no more than `concurrentCalls` run at once. A day smaller than the limit of
 * a call is the limit of its one call.
 *
 * The day can end above its ceiling by the input of the last round of each call in flight, no
 * more. The budget is kept in memory: it holds within one process, and a restart starts the day
 * again.
 */
export interface TokenBudget {
  /** Sets tokens aside for one call, or refuses it with a problem the person can read. */
  reserve(): TokenReservation;
}

export function createTokenBudget(limits: TokenBudgetLimits, clock: Clock): TokenBudget {
  const perCall = Math.min(limits.tokensPerCall, limits.dailyTokens);
  let day = '';
  let spent = 0;
  let reserved = 0;
  let inFlight = 0;
  const spendToday = (tokens: number) => {
    const today = clock().toISOString().slice(0, 10);
    if (today !== day) {
      day = today;
      spent = 0;
    }
    spent += tokens;
  };

  return {
    reserve() {
      spendToday(0);
      if (spent + reserved + perCall > limits.dailyTokens) {
        throw budgetSpent();
      }
      if (inFlight >= limits.concurrentCalls) {
        throw busy();
      }
      reserved += perCall;
      inFlight += 1;
      let open = true;
      const close = (tokens: number) => {
        if (open) {
          open = false;
          reserved -= perCall;
          inFlight -= 1;
          spendToday(tokens);
        }
      };
      return {
        tokens: perCall,
        settle: close,
        release: () => {
          close(0);
        },
      };
    },
  };
}

/**
 * The tokens a failure says its call spent before it: a model cut off, refused or failing after
 * some rounds, or Rewire's own code failing after the model answered. Any other failure spent
 * nothing that is known.
 */
function tokensSpentBy(error: unknown): number {
  return error instanceof Error && 'tokensSpent' in error && typeof error.tokensSpent === 'number'
    ? error.tokensSpent
    : 0;
}

/**
 * Runs one call within the budget: its limit is set aside first and handed to it, and it is
 * settled with what it spent, also when it fails, with what its failure says it had spent.
 */
export async function withinBudget<Result>(
  budget: TokenBudget,
  call: (tokenLimit: number) => Promise<Result>,
  tokensOf: (result: Result) => number,
): Promise<Result> {
  const reservation = budget.reserve();
  try {
    const result = await call(reservation.tokens);
    reservation.settle(tokensOf(result));
    return result;
  } catch (error) {
    reservation.settle(tokensSpentBy(error));
    throw error instanceof SpentBeforeFailing ? error.failure : error;
  } finally {
    reservation.release();
  }
}

/**
 * A model that answers only while the day's budget lasts, within the limit set aside for each
 * call, and whose every answer is counted: also the ones a check then discards, which cost the
 * same, and the ones cut off.
 */
export function meteredBy(budget: TokenBudget, model: GuideModel): GuideModel {
  return {
    complete: (request) =>
      withinBudget(
        budget,
        (tokenLimit) => model.complete({ ...request, tokenLimit }),
        (completion) => completion.tokens,
      ),
  };
}

function budgetSpent(): HttpProblem {
  return new HttpProblem({
    status: 429,
    code: 'guide_budget_spent',
    title: 'The guide is resting',
    detail: 'The AI guide has used its budget for today. Everything else works as usual.',
  });
}

function busy(): HttpProblem {
  return new HttpProblem({
    status: 429,
    code: 'guide_busy',
    title: 'The guide is busy',
    detail: 'The AI guide is answering other people right now. Try again in a moment.',
  });
}
