import type {
  Completion,
  CompletionRequest,
  GuideModel,
  GuideTool,
} from '../../src/modules/guide/model.ts';

/** One request to the scripted model, with a way to call its tools as a real model would. */
export interface ScriptedTurn {
  readonly request: CompletionRequest;
  /** The names of the tools the request offers. */
  readonly toolNames: readonly string[];
  /**
   * Calls a tool by name. The input is checked against the tool's schema first, as the SDK's
   * tool runner does, and what the tool answers is returned.
   */
  readonly call: (name: string, input: unknown) => Promise<string>;
}

/** Decides what the model does with a request: which tools to call and what to answer. */
export type Script = (turn: ScriptedTurn) => Promise<string> | string;

export interface ScriptedModel extends GuideModel {
  /** Every request the model received, oldest first. */
  readonly requests: CompletionRequest[];
  /** What each tool call answered, in order. */
  readonly toolAnswers: { name: string; answer: string }[];
}

interface ScriptedModelOptions {
  /** Tokens each answer costs, to test the daily budget. */
  readonly tokensPerAnswer?: number;
}

/**
 * A language model the test writes. It runs no network and spends no token: the script
 * receives each request with its tools and decides what to call and what to say. To make
 * the model refuse or be cut off, the script throws a `GuideModelError`.
 */
export function createScriptedModel(
  script: Script,
  { tokensPerAnswer = 100 }: ScriptedModelOptions = {},
): ScriptedModel {
  const requests: CompletionRequest[] = [];
  const toolAnswers: { name: string; answer: string }[] = [];

  return {
    requests,
    toolAnswers,
    async complete(request): Promise<Completion> {
      requests.push(request);
      const call = async (name: string, input: unknown) => {
        const answer = await runTool(request.tools, name, input);
        toolAnswers.push({ name, answer });
        return answer;
      };
      const text = await script({
        request,
        toolNames: request.tools.map((tool) => tool.name),
        call,
      });
      return { text, tokens: tokensPerAnswer };
    },
  };
}

async function runTool(tools: readonly GuideTool[], name: string, input: unknown): Promise<string> {
  const tool = tools.find((candidate) => candidate.name === name);
  if (tool === undefined) {
    throw new Error(`the request offers no tool ${name}`);
  }
  return tool.run(tool.input.parse(input));
}
