/**
 * A deterministic stand-in for the model behind the analyst of "Analyse", for end-to-end tests
 * only. AG Studio runs the agents and their tools in the browser; this model answers each turn as
 * a careful model would, so the tests see the real loop: the analyst reads an occupation's tasks
 * with its own tool, or hands a filter to Studio's page agent, which applies it.
 */
import type { StudioItem, StudioTurnResponse } from '@rewire/contracts';
import { z } from 'zod';

import type { StudioModel } from '../../../apps/api/src/modules/analyst/studio-model.ts';
import type { StudioTurn } from '../../../apps/api/src/modules/analyst/turn-policy.ts';

const CLERICAL = '4 · Clerical support workers';

const tasksSchema = z.object({
  title: z.string(),
  exposure: z.number(),
  tasks: z.array(z.object({ task: z.string(), score: z.number() })).min(1),
});

/** Studio hands a tool's answer back to the model as `{ success, response }`. */
const toolResultSchema = z.object({ success: z.literal(true), response: z.string() });

function summaryIn(output: string): z.infer<typeof tasksSchema> {
  const { response } = toolResultSchema.parse(JSON.parse(output));
  return tasksSchema.parse(JSON.parse(response));
}

let answers = 0;

function respond(output: StudioTurnResponse['output']): StudioTurnResponse {
  answers += 1;
  return {
    id: `demo-${String(answers)}`,
    status: 'completed',
    output,
    usage: { inputTokens: 100, outputTokens: 20 },
    model: 'demo',
  };
}

const say = (text: string) => respond([{ type: 'message', role: 'assistant', text }]);
const call = (name: string, input: unknown) =>
  respond([
    {
      type: 'function_call',
      callId: `call-${String(answers + 1)}`,
      name,
      arguments: JSON.stringify(input),
    },
  ]);

/** What a tool answered, the last time it was called in this conversation. */
function outputOf(input: readonly StudioItem[], tool: string): string | undefined {
  const calls = new Set(
    input.flatMap((item) =>
      item.type === 'function_call' && item.name === tool ? [item.callId] : [],
    ),
  );
  const outputs = input.flatMap((item) =>
    item.type === 'function_call_output' && calls.has(item.callId) ? [item.output] : [],
  );
  return outputs.at(-1);
}

function question(input: readonly StudioItem[]): string {
  const asked = input.filter((item) => item.type === 'message' && item.role === 'user');
  const last = asked.at(-1);
  return last?.type === 'message' ? last.text.toLowerCase() : '';
}

/** Studio's page agent: applies the filter it was asked for, then reports it. */
function pageAgent(request: StudioTurn): StudioTurnResponse {
  if (outputOf(request.input, 'add_page_filter') === undefined) {
    return call('add_page_filter', {
      op: 'append',
      value: {
        field: { id: 'majorGroups.majorGroup' },
        model: { operator: 'equals', value: CLERICAL },
      },
    });
  }
  return call('complete_task', { summary: `Filtered the page to ${CLERICAL}.`, artifacts: [] });
}

/** Rewire's analyst: its own tool for an occupation's tasks, the page agent for a filter. */
function analyst(request: StudioTurn): StudioTurnResponse {
  const asked = question(request.input);
  if (asked.includes('4132')) {
    const read = outputOf(request.input, 'read_occupation_tasks');
    if (read === undefined) {
      return call('read_occupation_tasks', { isco08: '4132' });
    }
    const { title, exposure, tasks } = summaryIn(read);
    const [first] = tasks;
    return say(
      `${title} score ${String(exposure)} out of 100 (ILO, 2025). Their most exposed task is ` +
        `"${first?.task ?? ''}", at ${String(first?.score ?? 0)}.`,
    );
  }
  if (asked.includes('clerical') || asked.includes('administrativo')) {
    if (outputOf(request.input, 'delegate_to') === undefined) {
      return call('delegate_to', {
        type: { id: 'page', pageId: 'overview' },
        instructions: `Filter the overview page to the major group ${CLERICAL}.`,
      });
    }
    return say(`I filtered the page to ${CLERICAL}; every key figure now counts only them.`);
  }
  return say('I can read the figures of this dashboard and change it for you.');
}

export function createDemoStudioModel(): StudioModel {
  return {
    turn(request) {
      const tools = new Set(request.tools.map((tool) => tool.name));
      if (tools.has('add_page_filter')) {
        return Promise.resolve(pageAgent(request));
      }
      if (tools.has('read_occupation_tasks')) {
        return Promise.resolve(analyst(request));
      }
      return Promise.resolve(say('Done.'));
    },
  };
}
