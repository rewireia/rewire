import type { StudioItem, StudioTurnResponse } from '@rewire/contracts';
import { z } from 'zod';

import type { Fetch } from '../../platform/fetch.ts';
import { postResponses } from '../../platform/openai-responses.ts';

import type { AdmittedTurn } from './turn-policy.ts';

/**
 * The model behind the analyst: one turn the server admitted in, one answer out. Studio runs the
 * loop and the tools. A turn writes no more than `tokenLimit` tokens, the share of the budget set
 * aside for it.
 */
export interface StudioModel {
  turn(request: AdmittedTurn, tokenLimit?: number): Promise<StudioTurnResponse>;
}

/**
 * The model declined or answered something the analyst cannot use. It carries the tokens the
 * turn is known to have spent, which the budget counts.
 */
export class StudioModelError extends Error {
  override readonly name = 'StudioModelError';
  readonly reason: 'refused' | 'unreadable' | 'failed';
  readonly tokensSpent: number;

  constructor(
    reason: StudioModelError['reason'],
    { tokensSpent = 0, ...options }: ErrorOptions & { readonly tokensSpent?: number } = {},
  ) {
    super(`the model did not answer the turn: ${reason}`, options);
    this.reason = reason;
    this.tokensSpent = tokensSpent;
  }
}

export interface OpenAiStudioOptions {
  readonly apiKey: string;
  readonly model: string;
  readonly effort: 'low' | 'medium' | 'high';
}

/** The ceiling of one answer, which for a reasoning model holds its reasoning too. */
const MAXIMUM_OUTPUT_TOKENS = 16_000;

type Item = Record<string, unknown>;

const answerSchema = z.object({
  id: z.string(),
  status: z.string(),
  model: z.string(),
  output: z.array(z.record(z.string(), z.unknown())),
  usage: z.object({ input_tokens: z.number(), output_tokens: z.number() }),
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

const functionCallSchema = z.object({
  type: z.literal('function_call'),
  call_id: z.string(),
  name: z.string(),
  arguments: z.string(),
});

/**
 * An OpenAI model behind Studio's harness, through the Responses API. Nothing is kept on OpenAI's
 * side (`store: false`): each turn carries the whole conversation, which Studio keeps. The
 * model's reasoning is not carried from one turn to the next, so none is asked back.
 *
 * The server's purpose is the first item and the only system message. What the client sends as
 * instructions, or as system messages of its conversation, goes in as developer messages after
 * it, which rank below it.
 */
export function createOpenAiStudioModel(
  options: OpenAiStudioOptions,
  fetcher: Fetch = (url, init) => fetch(url, init),
): StudioModel {
  return {
    async turn(request, tokenLimit = MAXIMUM_OUTPUT_TOKENS) {
      const answer = answerSchema.safeParse(
        await postResponses(fetcher, options.apiKey, bodyOf(options, request, tokenLimit)),
      );
      if (!answer.success) {
        throw new StudioModelError('unreadable', { cause: answer.error });
      }
      return responseOf(answer.data);
    },
  };
}

function bodyOf(options: OpenAiStudioOptions, request: AdmittedTurn, tokenLimit: number): Item {
  const body: Item = {
    model: options.model,
    input: [
      { role: 'system', content: request.purpose },
      ...(request.instructions === undefined
        ? []
        : [{ role: 'developer', content: request.instructions }]),
      ...request.input.map(inputItemOf),
    ],
    tools: request.tools.map((tool) => ({ type: 'function', ...tool, strict: false })),
    reasoning: { effort: options.effort },
    max_output_tokens: Math.min(MAXIMUM_OUTPUT_TOKENS, tokenLimit),
    store: false,
  };
  if (request.toolChoice !== undefined) {
    body['tool_choice'] = request.toolChoice;
  }
  if (request.responseFormat.type === 'json') {
    const { name, description, schema } = request.responseFormat;
    body['text'] = { format: { type: 'json_schema', name, description, schema, strict: false } };
  }
  return body;
}

/** An item of the conversation as the Responses API takes it. */
function inputItemOf(item: StudioItem): Item {
  switch (item.type) {
    case 'message':
      return { role: item.role === 'system' ? 'developer' : item.role, content: item.text };
    case 'function_call':
      return {
        type: 'function_call',
        call_id: item.callId,
        name: item.name,
        arguments: item.arguments,
      };
    case 'function_call_output':
      return { type: 'function_call_output', call_id: item.callId, output: item.output };
  }
}

function responseOf(answer: z.infer<typeof answerSchema>): StudioTurnResponse {
  const tokensSpent = answer.usage.input_tokens + answer.usage.output_tokens;
  if (answer.status !== 'completed' && answer.status !== 'incomplete') {
    throw new StudioModelError('failed', { tokensSpent });
  }
  const output = answer.output.flatMap(outputItemOf);
  if (output.length === 0 && answer.output.some(isRefusal)) {
    throw new StudioModelError('refused', { tokensSpent });
  }
  return {
    id: answer.id,
    status: answer.status,
    output,
    usage: { inputTokens: answer.usage.input_tokens, outputTokens: answer.usage.output_tokens },
    model: answer.model,
  };
}

/** The text and the tool calls of the answer; its reasoning stays on the server. */
function outputItemOf(item: Item): StudioTurnResponse['output'] {
  const call = functionCallSchema.safeParse(item);
  if (call.success) {
    const { call_id: callId, name, arguments: input } = call.data;
    return [{ type: 'function_call', callId, name, arguments: input }];
  }
  const message = messageSchema.safeParse(item);
  if (!message.success) {
    return [];
  }
  const text = message.data.content.flatMap((part) =>
    part.type === 'output_text' ? [part.text] : [],
  );
  return text.length === 0 ? [] : [{ type: 'message', role: 'assistant', text: text.join('\n') }];
}

function isRefusal(item: Item): boolean {
  const message = messageSchema.safeParse(item);
  return message.success && message.data.content.some((part) => part.type === 'refusal');
}
