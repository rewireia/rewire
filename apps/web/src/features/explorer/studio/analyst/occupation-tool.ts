import type { ExposureReport } from '@rewire/contracts';
import type { AgAiTool, AgStudioApi } from 'ag-studio';

import { toPoints } from '../../../../i18n/format.ts';

const ISCO08 = /^\d{4}$/;

/** What the model reads about an occupation: its figures and every task with its score. */
export function tasksSummaryOf(report: ExposureReport): string {
  return JSON.stringify({
    source: 'ILO, 2025',
    isco08: report.isco08,
    title: report.title,
    majorGroup: report.majorGroup.title,
    exposure: toPoints(report.meanScore),
    level: report.gradient,
    tasks: report.tasks.map((task) => ({
      task: task.text,
      score: toPoints(task.score),
      band: task.band,
    })),
  });
}

/**
 * The analyst's own tool: it reads from Rewire what Studio's tables do not hold, the tasks of an
 * occupation with their scores, so that the analyst can say why the occupation scores as it does.
 */
export function occupationTasksTool(
  api: AgStudioApi,
  readReport: (isco08: string, signal: AbortSignal) => Promise<ExposureReport>,
): AgAiTool {
  return api.defineAiTool({
    name: 'read_occupation_tasks',
    description:
      'Reads the tasks of one occupation with the ILO score of each (0 to 100), from Rewire. ' +
      'Use it to explain why an occupation scores as it does.',
    params: (s) => s.object({ isco08: s.string({ description: 'The four-digit ISCO-08 code.' }) }),
    execute: async ({ isco08 }, context) => {
      if (!ISCO08.test(isco08)) {
        return context.error('The ISCO-08 code has four digits, such as 4132.');
      }
      try {
        return context.success(tasksSummaryOf(await readReport(isco08, context.signal)));
      } catch {
        return context.error(`Rewire has no scored occupation with the code ${isco08}.`);
      }
    },
  });
}
