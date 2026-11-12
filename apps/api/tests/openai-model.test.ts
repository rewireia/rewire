import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { GuideModelError, SpentBeforeFailing, type GuideTool } from '../src/modules/guide/model.ts';
import { createOpenAiModel } from '../src/modules/guide/openai-model.ts';
import type { Fetch } from '../src/platform/fetch.ts';

const sentBodySchema = z.object({
  model: z.string(),
  instructions: z.string(),
  input: z.array(z.record(z.string(), z.unknown())),
  tools: z.array(z.record(z.string(), z.unknown())),
  reasoning: z.object({ effort: z.string() }),
  include: z.array(z.string()),
  max_output_tokens: z.number(),
  store: z.boolean(),
});

type SentBody = z.infer<typeof sentBodySchema>;

/** One answer of the Responses API, as far as the adapter reads it. */
const answer = (output: unknown[], status = 'completed') =>
  Response.json({ status, output, usage: { input_tokens: 100, output_tokens: 20 } });

const said = (text: string) => ({
  type: 'message',
  role: 'assistant',
  content: [{ type: 'output_text', text }],
});

const calling = (name: string, input: unknown, callId = 'call_1') => ({
  type: 'function_call',
  call_id: callId,
  name,
  arguments: typeof input === 'string' ? input : JSON.stringify(input),
});

const REASONING = { type: 'reasoning', id: 'rs_1', encrypted_content: 'sealed' };

/** OpenAI in memory: it gives the answers it was told to, in order, and keeps what it was sent. */
function fakeOpenAi(...answers: (() => Response | Promise<Response>)[]) {
  const sent: { headers: Headers; body: SentBody }[] = [];
  const fetcher: Fetch = (_url, init) => {
    const next = answers[sent.length];
    sent.push({
      headers: new Headers(init.headers),
      body: sentBodySchema.parse(JSON.parse(typeof init.body === 'string' ? init.body : '')),
    });
    if (next === undefined) {
      throw new Error('the test expected no further request');
    }
    return Promise.resolve(next());
  };
  return { fetcher, sent };
}

/** A tool that looks an occupation up, and remembers what it was asked. */
function searchTool() {
  const asked: string[] = [];
  const tool: GuideTool<{ query: string }> = {
    name: 'search_occupations',
    description: 'Searches the official classification for a job title.',
    input: z.object({ query: z.string().min(2) }),
    run: ({ query }) => {
      asked.push(query);
      return Promise.resolve('[{"code":"43-3051.00","title":"Payroll and Timekeeping Clerks"}]');
    },
  };
  return { tool: tool as GuideTool, asked };
}

const complete = (fetcher: Fetch, tools: GuideTool[] = [], tokenLimit?: number) =>
  createOpenAiModel({ apiKey: 'test-key', model: 'test-model', effort: 'high' }, fetcher).complete({
    system: 'Find the occupation.',
    turns: [{ role: 'user', text: 'I do the payroll.' }],
    tools,
    ...(tokenLimit === undefined ? {} : { tokenLimit }),
  });

/** What a call that failed says it had spent. */
const spentBy = async (attempt: Promise<unknown>) =>
  attempt.then(
    () => 'answered',
    (error: unknown) =>
      error instanceof GuideModelError || error instanceof SpentBeforeFailing
        ? error.tokensSpent
        : 'another error',
  );

const reasonOf = async (attempt: Promise<unknown>) =>
  attempt.then(
    () => 'answered',
    (error: unknown) => (error instanceof GuideModelError ? error.reason : 'another error'),
  );

describe('an OpenAI model as the guide', () => {
  it('sends the instructions, the turns and the tools, and keeps nothing at OpenAI', async () => {
    const openai = fakeOpenAi(() => answer([said('Hello.')]));
    const { tool } = searchTool();
    const completion = await complete(openai.fetcher, [tool]);

    expect(completion).toEqual({ text: 'Hello.', tokens: 120 });
    const [request] = openai.sent;
    expect(request?.headers.get('Authorization')).toBe('Bearer test-key');
    expect(request?.body).toMatchObject({
      model: 'test-model',
      instructions: 'Find the occupation.',
      input: [{ role: 'user', content: 'I do the payroll.' }],
      reasoning: { effort: 'high' },
      include: ['reasoning.encrypted_content'],
      store: false,
    });
    expect(request?.body.tools).toEqual([
      {
        type: 'function',
        name: 'search_occupations',
        description: 'Searches the official classification for a job title.',
        parameters: {
          type: 'object',
          properties: { query: { type: 'string', minLength: 2 } },
          required: ['query'],
          additionalProperties: false,
        },
        strict: false,
      },
    ]);
  });

  it('uses a per-request effort through tool rounds without changing the model default', async () => {
    const openai = fakeOpenAi(
      () => answer([calling('search_occupations', { query: 'nurse' })]),
      () => answer([said('Which duties fit your work?')]),
      () => answer([said('Your report is ready.')]),
    );
    const model = createOpenAiModel(
      { apiKey: 'test-key', model: 'test-model', effort: 'high' },
      openai.fetcher,
    );
    const request = { system: 'Find the occupation.', turns: [], tools: [searchTool().tool] };
    await model.complete({ ...request, reasoningEffort: 'low' });
    await model.complete(request);
    expect(openai.sent.map(({ body }) => body.reasoning.effort)).toEqual(['low', 'low', 'high']);
  });

  it('runs the tools the model calls and sends back what they answer, with its reasoning', async () => {
    const openai = fakeOpenAi(
      () => answer([REASONING, calling('search_occupations', { query: 'payroll clerk' })]),
      () => answer([said('You are a payroll clerk.')]),
    );
    const { tool, asked } = searchTool();
    const completion = await complete(openai.fetcher, [tool]);

    expect(asked).toEqual(['payroll clerk']);
    expect(completion).toEqual({ text: 'You are a payroll clerk.', tokens: 240 });
    expect(openai.sent[1]?.body.input).toEqual([
      { role: 'user', content: 'I do the payroll.' },
      REASONING,
      calling('search_occupations', { query: 'payroll clerk' }),
      {
        type: 'function_call_output',
        call_id: 'call_1',
        output: '[{"code":"43-3051.00","title":"Payroll and Timekeeping Clerks"}]',
      },
    ]);
  });

  it('tells the model about an input a tool cannot accept, and does not run it', async () => {
    const openai = fakeOpenAi(
      () =>
        answer([
          calling('search_occupations', { query: 'x' }, 'call_short'),
          calling('search_occupations', '{not json', 'call_broken'),
          calling('delete_everything', {}, 'call_unknown'),
        ]),
      () => answer([said('Sorry.')]),
    );
    const { tool, asked } = searchTool();
    await complete(openai.fetcher, [tool]);

    expect(asked).toEqual([]);
    const outputs = openai.sent[1]?.body.input.filter(
      (item) => item['type'] === 'function_call_output',
    );
    expect(outputs?.map((item) => item['call_id'])).toEqual([
      'call_short',
      'call_broken',
      'call_unknown',
    ]);
    expect(String(outputs?.[0]?.['output'])).toContain('The input is not valid');
    expect(String(outputs?.[1]?.['output'])).toContain('The input is not valid');
    expect(outputs?.[2]?.['output']).toBe('There is no tool named delete_everything.');
  });

  it('counts an answer that holds only a refusal as a refusal', async () => {
    const refusal = { type: 'message', content: [{ type: 'refusal', refusal: 'No.' }] };
    expect(await reasonOf(complete(fakeOpenAi(() => answer([refusal])).fetcher))).toBe('refused');
  });

  it('counts an answer cut off, or tools still called after eight rounds, as truncated', async () => {
    const cutOff = fakeOpenAi(() => answer([said('You are')], 'incomplete'));
    expect(await reasonOf(complete(cutOff.fetcher))).toBe('truncated');

    const { tool, asked } = searchTool();
    const again = () => answer([calling('search_occupations', { query: 'payroll' })]);
    const endless = fakeOpenAi(again, again, again, again, again, again, again, again);
    expect(await reasonOf(complete(endless.fetcher, [tool]))).toBe('truncated');
    expect(asked).toHaveLength(8);
  });

  it('is unavailable when OpenAI refuses, cannot be reached or answers something else', async () => {
    const spent = fakeOpenAi(() =>
      Response.json({ error: { code: 'insufficient_quota' } }, { status: 429 }),
    );
    expect(await reasonOf(complete(spent.fetcher))).toBe('unavailable');

    const unreachable: Fetch = () => Promise.reject(new TypeError('fetch failed'));
    expect(await reasonOf(complete(unreachable))).toBe('unavailable');

    const unreadable = fakeOpenAi(() => new Response('<html>'));
    expect(await reasonOf(complete(unreadable.fetcher))).toBe('unavailable');

    const anotherShape = fakeOpenAi(() => Response.json({ status: 'completed' }));
    expect(await reasonOf(complete(anotherShape.fetcher))).toBe('unavailable');
  });
});

describe('what a call of the guide spends', () => {
  it('writes no more in a round than what is left of its limit, and stops once it is spent', async () => {
    const { tool } = searchTool();
    const again = () => answer([calling('search_occupations', { query: 'payroll' })]);
    const openai = fakeOpenAi(again, again, again);
    // Each round spends 120: after two, 10 tokens are left, too few to start a third.
    expect(await spentBy(complete(openai.fetcher, [tool], 250))).toBe(240);
    expect(openai.sent.map(({ body }) => body.max_output_tokens)).toEqual([250, 130]);
  });

  it('keeps every round within the ceiling of a request when its limit is larger', async () => {
    const openai = fakeOpenAi(() => answer([said('Hello.')]));
    await complete(openai.fetcher, [], 1_000_000);
    expect(openai.sent[0]?.body.max_output_tokens).toBe(16_000);
  });

  it('says what it spent when it is cut off, refused or failing after its tools', async () => {
    const cutOff = fakeOpenAi(() => answer([said('You are')], 'incomplete'));
    expect(await spentBy(complete(cutOff.fetcher))).toBe(120);

    const refusal = { type: 'message', content: [{ type: 'refusal', refusal: 'No.' }] };
    expect(await spentBy(complete(fakeOpenAi(() => answer([refusal])).fetcher))).toBe(120);

    const { tool } = searchTool();
    const afterTools = fakeOpenAi(
      () => answer([calling('search_occupations', { query: 'payroll clerk' })]),
      () => Response.json({ error: { code: 'server_error' } }, { status: 500 }),
    );
    const failure = await complete(afterTools.fetcher, [tool]).catch((error: unknown) => error);
    expect(failure).toMatchObject({ reason: 'unavailable', tokensSpent: 120 });
  });

  it('lets a failure of a tool go on, with what the rounds before it spent', async () => {
    const broken: GuideTool = {
      name: 'search_occupations',
      description: 'Breaks.',
      input: z.object({ query: z.string() }),
      run: () => Promise.reject(new TypeError('the tool broke')),
    };
    const failing = fakeOpenAi(() => answer([calling('search_occupations', { query: 'payroll' })]));
    const failure = await complete(failing.fetcher, [broken]).catch((error: unknown) => error);
    expect(failure).toBeInstanceOf(SpentBeforeFailing);
    expect(failure).toMatchObject({ tokensSpent: 120, failure: new TypeError('the tool broke') });
  });
});
