import type { StudioItem, StudioTurnRequest, StudioTurnResponse } from '@rewire/contracts';
import type {
  AgAiConversationItem,
  AgAiEvent,
  AgAiOutputItem,
  AgLlmRequest,
  AgLlmResponse,
} from 'ag-studio';

/** Words of a message, from the parts that are text; pictures and files are not sent. */
function textOf(parts: readonly { readonly type: string; readonly text?: string }[]): string {
  return parts.flatMap((part) => (part.type === 'text' && part.text ? [part.text] : [])).join('\n');
}

function itemOf(item: AgAiConversationItem): StudioItem[] {
  switch (item.type) {
    case 'message': {
      const text = textOf(item.content);
      return text === '' ? [] : [{ type: 'message', role: item.role, text }];
    }
    case 'function_call':
      return [
        { type: 'function_call', callId: item.callId, name: item.name, arguments: item.arguments },
      ];
    case 'function_call_output':
      return [{ type: 'function_call_output', callId: item.callId, output: item.output }];
    case 'reasoning':
      // The model's reasoning stays with the model: it is not carried back.
      return [];
  }
}

/**
 * A call Studio replays with its `result` on it, and no answer of its own, gets that answer right
 * after it: the model needs every call it made answered.
 */
function answeredCalls(input: readonly AgAiConversationItem[]): StudioItem[] {
  const answered = new Set(
    input.flatMap((item) => (item.type === 'function_call_output' ? [item.callId] : [])),
  );
  return input.flatMap((item) => {
    const items = itemOf(item);
    if (item.type === 'function_call' && item.result !== undefined && !answered.has(item.callId)) {
      items.push({ type: 'function_call_output', callId: item.callId, output: item.result });
    }
    return items;
  });
}

/** Studio's request for one turn, as the contract of `POST /api/studio/turn` carries it. */
export function turnRequestOf(request: AgLlmRequest): StudioTurnRequest {
  const { toolChoice, responseFormat } = request;
  return {
    ...(request.instructions === undefined ? {} : { instructions: request.instructions }),
    input: answeredCalls(request.input),
    tools: (request.tools ?? []).map(({ name, description, parameters }) => ({
      name,
      description,
      parameters: { ...parameters },
    })),
    ...(toolChoice === undefined
      ? {}
      : {
          toolChoice:
            typeof toolChoice === 'string'
              ? toolChoice
              : { type: 'function', name: toolChoice.name },
        }),
    responseFormat:
      responseFormat.type === 'text'
        ? { type: 'text' }
        : {
            type: 'json',
            name: responseFormat.name,
            schema: { ...responseFormat.schema },
            ...(responseFormat.description === undefined
              ? {}
              : { description: responseFormat.description }),
          },
  };
}

/** The answer as the events Studio's chat panel draws, in the order the model gave them. */
export function eventsOf(response: StudioTurnResponse): AgAiEvent[] {
  return response.output.flatMap((item, index): AgAiEvent[] => {
    if (item.type === 'message') {
      const messageId = `${response.id}-${String(index)}`;
      return [
        { type: 'TEXT_MESSAGE_START', messageId, role: 'assistant' },
        { type: 'TEXT_MESSAGE_CONTENT', messageId, delta: item.text },
        { type: 'TEXT_MESSAGE_END', messageId },
      ];
    }
    const toolCallId = item.callId;
    return [
      { type: 'TOOL_CALL_START', toolCallId, toolCallName: item.name },
      { type: 'TOOL_CALL_ARGS', toolCallId, delta: item.arguments },
      { type: 'TOOL_CALL_END', toolCallId },
    ];
  });
}

function outputItemOf(item: StudioTurnResponse['output'][number], id: string): AgAiOutputItem {
  if (item.type === 'message') {
    return {
      id,
      kind: 'output',
      type: 'message',
      role: 'assistant',
      status: 'completed',
      content: [{ type: 'text', text: item.text, annotations: [] }],
    };
  }
  const { callId, name, arguments: input } = item;
  return {
    id: callId,
    kind: 'output',
    type: 'function_call',
    callId,
    name,
    arguments: input,
    status: 'completed',
  };
}

/** The finished answer, as Studio keeps it in the conversation. */
export function llmResponseOf(response: StudioTurnResponse, createdAt: number): AgLlmResponse {
  return {
    id: response.id,
    createdAt,
    status: response.status,
    output: response.output.map((item, index) =>
      outputItemOf(item, `${response.id}-${String(index)}`),
    ),
    usage: response.usage,
    model: response.model,
  };
}

/** A turn that did not come back: Studio shows the failure and the conversation can go on. */
export function failedResponseOf(error: unknown, createdAt: number): AgLlmResponse {
  return {
    id: `failed-${String(createdAt)}`,
    createdAt,
    status: 'failed',
    output: [],
    error: {
      code: 'analyst_unavailable',
      message: error instanceof Error ? error.message : 'failed',
    },
  };
}
