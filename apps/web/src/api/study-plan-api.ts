import {
  studyTimelineSchema,
  type Region,
  type StudyPlan,
  type StudyTimeline,
} from '@rewire/contracts';

import { sendJson, type Request } from './request.ts';

const studyPlanPath = (region: Region, query: Record<string, string>) =>
  `/regions/${region}/study-plan?${new URLSearchParams(query)}`;

/** The learning plan laid out in time, and the pace the learner sets for it. */
export function studyPlanApi(request: Request) {
  return {
    /** `today` is the reader's own day, which a plan not yet saved starts on. */
    studyTimeline(
      region: Region,
      isco08: string,
      today: string,
      signal?: AbortSignal,
    ): Promise<StudyTimeline> {
      const path = studyPlanPath(region, { isco08, today });
      return request(path, studyTimelineSchema, { signal: signal ?? null });
    },
    /** Saves the whole plan; a visitor becomes a learner. The answer is the plan laid out again. */
    saveStudyPlan(
      region: Region,
      isco08: string,
      today: string,
      plan: StudyPlan,
    ): Promise<StudyTimeline> {
      const path = studyPlanPath(region, { isco08, today });
      return request(path, studyTimelineSchema, sendJson('PUT', plan));
    },
  };
}
