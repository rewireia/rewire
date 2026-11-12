import { jobLossClaimsIn } from './claims.ts';
import { figuresIn, taskReferencesBeyond } from './figures.ts';
import type { CompletionRequest, GuideModel, GuideTool } from './model.ts';

/**
 * An answer of the model that passes Rewire's checks, which are rules on its words: it holds no
 * figure, since the page shows every number in the cards of what the tools found, no task tag,
 * which a conversation has no report to point at, and no sentence that says, without denying it,
 * that a job will be lost. `undefined` when the model fails them twice.
 *
 * The first attempt works with the tools. If its answer fails, the model writes it again
 * from what the tools already returned and without tools, so that nothing a tool did, such
 * as opening an order, happens twice.
 */
export async function answerThatPassesChecks(
  model: GuideModel,
  request: CompletionRequest,
): Promise<string | undefined> {
  const heard: string[] = [];
  const first = await model.complete({ ...request, tools: request.tools.map(listenTo(heard)) });
  const faults = faultsOf(first.text);
  if (faults.length === 0) {
    return first.text;
  }
  const second = await model.complete({
    ...request,
    turns: [
      ...request.turns,
      { role: 'assistant', text: first.text },
      { role: 'user', text: correctionOf(faults, heard) },
    ],
    tools: [],
  });
  return faultsOf(second.text).length === 0 ? second.text : undefined;
}

/** What keeps a text from being shown, in words the model can act on. */
function faultsOf(text: string): string[] {
  const figures = [...figuresIn(text), ...taskReferencesBeyond(text, 0)];
  const claims = jobLossClaimsIn(text);
  return [
    ...(figures.length === 0
      ? []
      : [
          `It writes figures: ${figures.join(', ')}. The page shows every number in the cards ` +
            'of what your tools found; your words must hold none.',
        ]),
    ...claims.map(
      (sentence) => `It says a job will be lost, which the scores do not say: "${sentence}"`,
    ),
  ];
}

/** A tool that also keeps what it answered, for the attempt that has no tools. */
function listenTo(heard: string[]): (tool: GuideTool) => GuideTool {
  return (tool) => ({
    ...tool,
    async run(input) {
      const answer = await tool.run(input);
      heard.push(answer);
      return answer;
    },
  });
}

function correctionOf(faults: readonly string[], heard: readonly string[]): string {
  return [
    'Your answer cannot be shown.',
    ...faults,
    'Write it again in words, without any number, date or price.',
    'The tools you called have already run and done what they say below: a plan they changed is',
    'saved, an order they opened is open. The person sees their cards under your answer. Speak',
    'with that certainty and point to the cards; do not say that you cannot verify it, nor that',
    'the person shared this with you. What your tools returned:',
    heard.length === 0 ? '(nothing)' : heard.join('\n---\n'),
  ].join('\n');
}
