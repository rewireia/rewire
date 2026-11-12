import type { ExposureReport } from '@rewire/contracts';
import { personalExposureOf, type ExposureProfile, type TimeShare } from '@rewire/engine';

/** Shapes an exposure profile as the API answers it, for a given use of the week. */
export function presentReport(
  profile: ExposureProfile,
  timeByTask: ReadonlyMap<string, TimeShare> = new Map(),
): ExposureReport {
  return {
    isco08: profile.isco08,
    title: profile.title,
    majorGroup: profile.majorGroup,
    meanScore: profile.meanScore,
    standardDeviation: profile.standardDeviation,
    gradient: profile.gradient,
    tasks: profile.tasks.map((task) => ({ ...task })),
    tasksByBand: profile.tasksByBand,
    standing: profile.standing,
    personal: personalExposureOf(profile, timeByTask),
  };
}
