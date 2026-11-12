import type { ExposureReport, StudioTurnResponse } from '@rewire/contracts';
import type { AgLlmRequest } from 'ag-studio';
import { describe, expect, it } from 'vitest';

import { createAnalystAdapter } from '../src/features/explorer/studio/analyst/analyst-adapter.ts';
import { analystInstructions } from '../src/features/explorer/studio/analyst/instructions.ts';
import { tasksSummaryOf } from '../src/features/explorer/studio/analyst/occupation-tool.ts';
import {
  eventsOf,
  llmResponseOf,
  turnRequestOf,
} from '../src/features/explorer/studio/analyst/turn-mapping.ts';

const REQUEST: AgLlmRequest = {
  instructions: 'You are the analyst.',
  input: [
    {
      id: 'm1',
      kind: 'input',
      type: 'message',
      role: 'user',
      status: 'completed',
      content: [{ type: 'text', text: 'Why do clerks score high?' }],
    },
    { id: 'r1', kind: 'output', type: 'reasoning', summary: [] },
    {
      id: 'c1',
      kind: 'output',
      type: 'function_call',
      callId: 'call_1',
      name: 'read_occupation_tasks',
      arguments: '{"isco08":"4132"}',
      result: '{"success":true}',
    },
  ],
  tools: [
    { name: 'view_report', description: 'Reads the report.', parameters: { type: 'object' } },
  ],
  toolChoice: { name: 'view_report' },
  responseFormat: { type: 'text' },
};

const RESPONSE: StudioTurnResponse = {
  id: 'resp_1',
  status: 'completed',
  output: [
    { type: 'function_call', callId: 'call_2', name: 'delegate_to', arguments: '{}' },
    { type: 'message', role: 'assistant', text: 'Clerks score 54.' },
  ],
  usage: { inputTokens: 100, outputTokens: 10 },
  model: 'a-model',
};

describe('a turn of Studio as the server carries it', () => {
  it('keeps the words and the calls, answers every call, and leaves reasoning out', () => {
    expect(turnRequestOf(REQUEST)).toEqual({
      instructions: 'You are the analyst.',
      input: [
        { type: 'message', role: 'user', text: 'Why do clerks score high?' },
        {
          type: 'function_call',
          callId: 'call_1',
          name: 'read_occupation_tasks',
          arguments: '{"isco08":"4132"}',
        },
        { type: 'function_call_output', callId: 'call_1', output: '{"success":true}' },
      ],
      tools: [
        { name: 'view_report', description: 'Reads the report.', parameters: { type: 'object' } },
      ],
      toolChoice: { type: 'function', name: 'view_report' },
      responseFormat: { type: 'text' },
    });
  });

  it('replays the answer as the events of Studio’s chat panel, in order', () => {
    expect(eventsOf(RESPONSE).map((event) => event.type)).toEqual([
      'TOOL_CALL_START',
      'TOOL_CALL_ARGS',
      'TOOL_CALL_END',
      'TEXT_MESSAGE_START',
      'TEXT_MESSAGE_CONTENT',
      'TEXT_MESSAGE_END',
    ]);
    const response = llmResponseOf(RESPONSE, 1000);
    expect(response).toMatchObject({ id: 'resp_1', status: 'completed', createdAt: 1000 });
    expect(response.output.map((item) => item.type)).toEqual(['function_call', 'message']);
  });

  it('streams the turn the server answers, and reports one that fails', async () => {
    const adapter = createAnalystAdapter(
      () => Promise.resolve(RESPONSE),
      () => 5,
    );
    const handler = adapter.executeTurn(REQUEST);
    const types: string[] = [];
    for await (const event of handler.stream) {
      types.push(event.type);
    }
    expect(types).toHaveLength(6);
    expect((await handler.complete).status).toBe('completed');

    const failing = createAnalystAdapter(
      () => Promise.reject(new Error('no model')),
      () => 5,
    );
    const failed = failing.executeTurn(REQUEST);
    expect(await failed.complete).toMatchObject({ status: 'failed', output: [] });
  });
});

describe('the analyst', () => {
  it('is told where its figures may come from, and in which language to answer', () => {
    const english = analystInstructions('en');
    expect(english).toContain('State only figures that a query returned');
    expect(english).toContain('not a forecast of job');
    expect(english).toContain('Answer in English');
    expect(analystInstructions('es')).toContain('Answer in Spanish');
  });

  it('reads an occupation’s tasks as points from 0 to 100, with their source', () => {
    const report = {
      isco08: '4132',
      title: 'Data Entry Clerks',
      majorGroup: { code: '4', title: 'Clerical support workers' },
      meanScore: 0.7,
      gradient: 'gradient-4',
      tasks: [{ id: 't1', text: 'Entering data;', score: 0.74, band: 'medium' }],
    } as unknown as ExposureReport;
    expect(JSON.parse(tasksSummaryOf(report))).toEqual({
      source: 'ILO, 2025',
      isco08: '4132',
      title: 'Data Entry Clerks',
      majorGroup: 'Clerical support workers',
      exposure: 70,
      level: 'gradient-4',
      tasks: [{ task: 'Entering data;', score: 74, band: 'medium' }],
    });
  });
});
