import { z } from 'zod';

import type { Fetch } from '../../platform/fetch.ts';
import { OpenAiCallError, postResponses } from '../../platform/openai-responses.ts';

import {
  GuideModelError,
  SpentBeforeFailing,
  type Completion,
  type CompletionRequest,
  type GuideModel,
  type GuideTool,
} from './model.ts';

export interface OpenAiModelOptions {
  readonly apiKey: string;
  readonly model: string;
  /** How hard the model reasons before it answers. */
  readonly effort: 'low' | 'medium' | 'high';
}

/** The ceiling of one request, which for a reasoning model holds its reasoning too. */
const MAXIMUM_OUTPUT_TOKENS = 16_000;
/** The fewest output tokens the Responses API accepts: with less room left, no round starts. */
const MINIMUM_OUTPUT_TOKENS = 16;
/** Requests to the model in one turn: each round of tool calls is one. */
const MAXIMUM_TOOL_ROUNDS = 8;

/** An item of a conversation as the Responses API takes it and gives it back. */
type Item = Record<string, unknown>;

const answerSchema = z.object({
  status: z.string(),
  /** Messages, reasoning and tool calls, in the order the model produced them. */
  output: z.array(z.record(z.string(), z.unknown())),
  usage: z.object({ input_tokens: z.number(), output_tokens: z.number() }),
});

const functionCallSchema = z.object({
  type: z.literal('function_call'),
  call_id: z.string(),
  name: z.string(),
  /** The input of the tool, as JSON text. */
  arguments: z.string(),
});

const messageSchema = z.object({
  type: z.literal('message'),
  content: z.array(
    z.union([
      z.object({ type: z.literal('output_text'), text: z.string() }),
      z.object({ type: z.literal('refusal') }),
    ]),
  ),
});

type FunctionCall = z.infer<typeof functionCallSchema>;

/**
 * An OpenAI model as the guide's model, through the Responses API. Nothing is kept on
 * OpenAI's side between requests (`store: false`): each round sends the whole turn again,
 * with the model's own reasoning passed back to it encrypted.
 *
 * A call keeps within its `tokenLimit`: each round may write no more than what is left of it, and
 * no round starts once it is spent. A round's input is only known once it is answered, so a call
 * can end above its limit by the input of its last round, no more. Whatever ends a call, what its
 * rounds spent goes with it, also in its failure.
 */
export function createOpenAiModel(
  options: OpenAiModelOptions,
  fetcher: Fetch = (url, init) => fetch(url, init),
): GuideModel {
  const ask = async (request: CompletionRequest, input: readonly Item[], room: number) =>
    answerSchema.safeParse(
      await postResponses(fetcher, options.apiKey, {
        model: options.model,
        instructions: request.system,
        input,
        tools: request.tools.map(functionOf),
        reasoning: { effort: request.reasoningEffort ?? options.effort },
        include: ['reasoning.encrypted_content'],
        max_output_tokens: Math.min(MAXIMUM_OUTPUT_TOKENS, room),
        store: false,
      }),
    );

  return {
    async complete(request): Promise<Completion> {
      const spent = { tokens: 0 };
      try {
        return await rounds(request, spent, ask);
      } catch (error) {
        throw failureAfter(spent.tokens, error);
      }
    },
  };
}

type Ask = (
  request: CompletionRequest,
  input: readonly Item[],
  room: number,
) => Promise<ReturnType<typeof answerSchema.safeParse>>;

/** The rounds of one call: the model's tool calls answered, until it writes its answer. */
async function rounds(
  request: CompletionRequest,
  spent: { tokens: number },
  ask: Ask,
): Promise<Completion> {
  const input: Item[] = request.turns.map((turn) => ({ role: turn.role, content: turn.text }));
  const limit = request.tokenLimit ?? Number.POSITIVE_INFINITY;
  for (let round = 0; round < MAXIMUM_TOOL_ROUNDS; round += 1) {
    const room = limit - spent.tokens;
    if (room < MINIMUM_OUTPUT_TOKENS) {
      // The call has spent what it was given: it stops here, cut off.
      throw new GuideModelError('truncated');
    }
    const answer = await ask(request, input, room);
    if (!answer.success) {
      throw new GuideModelError('unavailable', { cause: answer.error });
    }
    const { status, output, usage } = answer.data;
    spent.tokens += usage.input_tokens + usage.output_tokens;
    if (status !== 'completed') {
      throw new GuideModelError('truncated');
    }
    const calls = output.flatMap((item) => {
      const call = functionCallSchema.safeParse(item);
      return call.success ? [call.data] : [];
    });
    if (calls.length === 0) {
      return { text: textOf(output), tokens: spent.tokens };
    }
    input.push(...output, ...(await Promise.all(calls.map(runCall(request.tools)))));
  }
  // Still asking for tools when the rounds ran out.
  throw new GuideModelError('truncated');
}

/**
 * A failure as it leaves the call, with what the call had spent: a failure of the model says it,
 * one of OpenAI makes the guide unavailable, and one of Rewire's own code goes on as it is.
 */
function failureAfter(tokensSpent: number, error: unknown): Error {
  if (error instanceof GuideModelError) {
    return new GuideModelError(error.reason, { tokensSpent, cause: error.cause });
  }
  if (error instanceof OpenAiCallError) {
    // Covers a spent quota (429) and a rejected key (401): the guide rests, the site works.
    return new GuideModelError('unavailable', { tokensSpent, cause: error });
  }
  if (!(error instanceof Error)) {
    return new Error('the call failed', { cause: error });
  }
  return tokensSpent > 0 ? new SpentBeforeFailing(tokensSpent, error) : error;
}

/** A tool as the Responses API describes a function the model may call. */
function functionOf(tool: GuideTool): Item {
  const { $schema: _dialect, ...parameters } = z.toJSONSchema(tool.input);
  return {
    type: 'function',
    name: tool.name,
    description: tool.description,
    parameters,
    // The tool checks its own input, so its schema need not meet the strict subset.
    strict: false,
  };
}

/**
 * Runs the tool a call names and wraps what it answers for the model. An input the tool
 * cannot accept is told to the model, which can then call again; it is never run.
 */
function runCall(tools: readonly GuideTool[]): (call: FunctionCall) => Promise<Item> {
  return async (call) => {
    const answer = (output: string): Item => ({
      type: 'function_call_output',
      call_id: call.call_id,
      output,
    });
    const tool = tools.find((candidate) => candidate.name === call.name);
    if (tool === undefined) {
      return answer(`There is no tool named ${call.name}.`);
    }
    const input = tool.input.safeParse(parseJson(call.arguments));
    if (!input.success) {
      return answer(`The input is not valid: ${z.prettifyError(input.error)}`);
    }
    return answer(await tool.run(input.data));
  };
}

/** The text of the model's answer. One that holds only a refusal is a refusal. */
function textOf(output: readonly Item[]): string {
  const parts = output.flatMap((item) => {
    const message = messageSchema.safeParse(item);
    return message.success ? message.data.content : [];
  });
  const text = parts.flatMap((part) => (part.type === 'output_text' ? [part.text] : []));
  if (text.length === 0 && parts.some((part) => part.type === 'refusal')) {
    throw new GuideModelError('refused');
  }
  return text.join('\n').trim();
}

/** JSON text as a value, or `undefined` when it is not JSON. */
function parseJson(text: string): unknown {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return undefined;
  }
}
