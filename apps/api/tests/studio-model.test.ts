import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { createOpenAiStudioModel, StudioModelError } from '../src/modules/analyst/studio-model.ts';
import { admitTurn, type AdmittedTurn } from '../src/modules/analyst/turn-policy.ts';
import type { Fetch } from '../src/platform/fetch.ts';
import { OpenAiCallError } from '../src/platform/openai-responses.ts';

const OPTIONS = { apiKey: 'sk-test', model: 'a-model', effort: 'low' } as const;

const sentSchema = z.record(z.string(), z.unknown());

/** OpenAI in memory: it gives the answers it was told to, in order, and keeps what it was sent. */
function fakeOpenAi(...answers: (() => Response)[]) {
  const sent: Record<string, unknown>[] = [];
  const fetcher: Fetch = (_url, init) => {
    const next = answers[sent.length];
    sent.push(sentSchema.parse(JSON.parse(typeof init.body === 'string' ? init.body : '')));
    if (next === undefined) {
      throw new Error('the test expected no further request');
    }
    return Promise.resolve(next());
  };
  return { fetcher, sent };
}

const answer =
  (output: unknown[], status = 'completed') =>
  () =>
    Response.json({
      id: 'resp_1',
      status,
      model: 'a-model-2026',
      output,
      usage: { input_tokens: 900, output_tokens: 40 },
    });

const TURN: AdmittedTurn = admitTurn({
  instructions: 'You are the analyst.',
  input: [
    { type: 'message', role: 'user', text: 'Which group is most exposed?' },
    { type: 'function_call', callId: 'call_1', name: 'execute_query', arguments: '{"q":1}' },
    { type: 'function_call_output', callId: 'call_1', output: '{"rows":[]}' },
  ],
  tools: [{ name: 'execute_query', description: 'Runs a query.', parameters: { type: 'object' } }],
  responseFormat: { type: 'text' },
});

describe('a turn of the analyst at OpenAI', () => {
  it('sends the conversation and the tools, and keeps nothing at OpenAI', async () => {
    const openAi = fakeOpenAi(
      answer([
        { type: 'reasoning', id: 'rs_1', summary: [] },
        { type: 'message', role: 'assistant', content: [{ type: 'output_text', text: 'Clerks.' }] },
      ]),
    );
    const response = await createOpenAiStudioModel(OPTIONS, openAi.fetcher).turn(TURN);

    expect(response).toEqual({
      id: 'resp_1',
      status: 'completed',
      output: [{ type: 'message', role: 'assistant', text: 'Clerks.' }],
      usage: { inputTokens: 900, outputTokens: 40 },
      model: 'a-model-2026',
    });
    expect(openAi.sent[0]).toMatchObject({
      model: 'a-model',
      store: false,
      reasoning: { effort: 'low' },
      input: [
        { role: 'system', content: TURN.purpose },
        { role: 'developer', content: 'You are the analyst.' },
        { role: 'user', content: 'Which group is most exposed?' },
        { type: 'function_call', call_id: 'call_1', name: 'execute_query', arguments: '{"q":1}' },
        { type: 'function_call_output', call_id: 'call_1', output: '{"rows":[]}' },
      ],
      tools: [{ type: 'function', name: 'execute_query', strict: false }],
    });
  });

  it('returns the calls the model makes, for Studio to run', async () => {
    const openAi = fakeOpenAi(
      answer([{ type: 'function_call', call_id: 'call_2', name: 'view_schema', arguments: '{}' }]),
    );
    const response = await createOpenAiStudioModel(OPTIONS, openAi.fetcher).turn(TURN);
    expect(response.output).toEqual([
      { type: 'function_call', callId: 'call_2', name: 'view_schema', arguments: '{}' },
    ]);
  });

  it('asks for JSON that meets a schema when Studio wants one', async () => {
    const openAi = fakeOpenAi(answer([]));
    const schema = { type: 'object', properties: { title: { type: 'string' } } };
    await createOpenAiStudioModel(OPTIONS, openAi.fetcher).turn({
      ...TURN,
      toolChoice: 'none',
      responseFormat: { type: 'json', name: 'thread_title', schema },
    });
    expect(openAi.sent[0]).toMatchObject({
      tool_choice: 'none',
      text: { format: { type: 'json_schema', name: 'thread_title', schema, strict: false } },
    });
  });

  it('says so when the answer cannot be read, is refused or failed', async () => {
    const model = (...answers: (() => Response)[]) =>
      createOpenAiStudioModel(OPTIONS, fakeOpenAi(...answers).fetcher);
    await expect(model(() => Response.json({ nothing: true })).turn(TURN)).rejects.toMatchObject({
      reason: 'unreadable',
    });
    const refusal = { type: 'message', content: [{ type: 'refusal', refusal: 'No.' }] };
    await expect(model(answer([refusal])).turn(TURN)).rejects.toMatchObject({ reason: 'refused' });
    await expect(model(answer([], 'failed')).turn(TURN)).rejects.toBeInstanceOf(StudioModelError);
    await expect(
      model(() => new Response('quota', { status: 429 })).turn(TURN),
    ).rejects.toBeInstanceOf(OpenAiCallError);
    await expect(model(() => new Response('<html>')).turn(TURN)).rejects.toBeInstanceOf(
      OpenAiCallError,
    );
  });
});
