import type { z } from 'zod';

/** A function the model may call while it works on an answer. */
export interface GuideTool<Input = unknown> {
  readonly name: string;
  /** Tells the model what the tool is for and when to use it. */
  readonly description: string;
  readonly input: z.ZodType<Input>;
  /** Runs the tool and returns what the model should read. */
  run(input: Input): Promise<string>;
}

interface GuideTurn {
  readonly role: 'user' | 'assistant';
  readonly text: string;
}

export interface CompletionRequest {
  /** The standing instructions of the task. */
  readonly system: string;
  /** The conversation, oldest first, ending with a user turn. */
  readonly turns: readonly GuideTurn[];
  readonly tools: readonly GuideTool[];
  /** Scoped reasoning budget; omitted for deeper report and purchasing work. */
  readonly reasoningEffort?: 'low' | 'medium' | 'high';
  /**
   * The most tokens the call may spend, in and out, over all its rounds: the share of the budget
   * reserved for it. Without one, only the number of rounds bounds it.
   */
  readonly tokenLimit?: number;
}

export interface Completion {
  readonly text: string;
  /** Tokens the answer cost, to keep the daily budget. */
  readonly tokens: number;
}

/**
 * The language model, as the guide needs it: given instructions, a conversation and some
 * tools, it answers in text. The model never touches data on its own: all it knows about
 * occupations, courses and orders is what the tools return.
 */
export interface GuideModel {
  complete(request: CompletionRequest): Promise<Completion>;
}

/**
 * The model declined, was cut off, or could not be reached. It carries the tokens the call is known
 * to have spent before it failed, which the budget counts: an answer cut off costs what it used.
 */
export class GuideModelError extends Error {
  override readonly name = 'GuideModelError';
  readonly reason: 'refused' | 'truncated' | 'unavailable';
  readonly tokensSpent: number;

  constructor(
    reason: GuideModelError['reason'],
    { tokensSpent = 0, ...options }: ErrorOptions & { readonly tokensSpent?: number } = {},
  ) {
    super(`the model did not answer: ${reason}`, options);
    this.reason = reason;
    this.tokensSpent = tokensSpent;
  }
}

/**
 * A failure of Rewire's own code, such as a tool, after the model had spent tokens. The budget
 * counts what was spent and lets the failure itself go on.
 */
export class SpentBeforeFailing extends Error {
  override readonly name = 'SpentBeforeFailing';
  readonly tokensSpent: number;
  readonly failure: Error;

  constructor(tokensSpent: number, failure: Error) {
    super('the call failed after the model had spent tokens', { cause: failure });
    this.tokensSpent = tokensSpent;
    this.failure = failure;
  }
}
