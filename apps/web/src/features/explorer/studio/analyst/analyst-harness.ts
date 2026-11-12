import type { ExposureReport } from '@rewire/contracts';
import {
  createAiHarness,
  directLlmRunner,
  type AgAiHarness,
  type AgAiPromptStarter,
  type AgLlmAdapter,
  type AgStudioApi,
} from 'ag-studio';

import type { Language } from '../../../../app/preferences.ts';
import type { Messages } from '../../../../i18n/use-messages.ts';

import { analystInstructions } from './instructions.ts';
import { occupationTasksTool } from './occupation-tool.ts';

const ANALYST_ID = 'rewire-analyst';
/** The agents of Studio the analyst hands work to. */
const DELEGATES = ['data', 'page', 'widget'] as const;

export interface AnalystOptions {
  readonly adapter: AgLlmAdapter;
  readonly language: Language;
  readonly t: Messages['t'];
  readonly readReport: (isco08: string, signal: AbortSignal) => Promise<ExposureReport>;
}

/** Suggestions for a conversation nobody has started, about these data. */
function promptStartersOf(t: Messages['t']): AgAiPromptStarter[] {
  return (['groups', 'why', 'clerks'] as const).map((starter) => ({
    label: t(`studio.analyst.starter.${starter}`),
    prompt: t(`studio.analyst.starter.${starter}.prompt`),
  }));
}

/**
 * The analyst: an agent of Rewire's own on AG Studio's agent framework. It knows the data and its
 * limits, reads the tasks of an occupation with its own tool, and hands queries, widgets and
 * filters to Studio's data, widget and page agents, which run on the same model.
 */
export function createAnalystHarness(api: AgStudioApi, options: AnalystOptions): AgAiHarness {
  const { adapter, language, t, readReport } = options;
  const tasks = occupationTasksTool(api, readReport);
  return createAiHarness(api, ({ builtIn }) => ({
    primary: ANALYST_ID,
    promptStarters: promptStartersOf(t),
    agents: [
      directLlmRunner({
        id: ANALYST_ID,
        name: t('studio.analyst.name'),
        description: 'Answers questions about the ILO exposure data and changes the dashboard.',
        instructions: () => analystInstructions(language),
        tools: ({ studio, tools }) => [
          studio.viewReport(),
          studio.viewPage(),
          tasks,
          tools.delegateTo(DELEGATES),
        ],
        maxTurns: 24,
        adapter,
      }),
      ...DELEGATES.map((id) => directLlmRunner({ ...builtIn[id], adapter })),
    ],
  }));
}
