import { stageOfLevel } from '@rewire/content';
import type {
  CatalogueCourse,
  PathwayStage,
  PlannedCourse,
  RoadmapCourse,
  StudyTimeline,
} from '@rewire/contracts';

/** Every module of the path, in the order of the plan. */
export function modulesOf(timeline: StudyTimeline): readonly PlannedCourse[] {
  return timeline.stages.flatMap((stage) => stage.courses);
}

/** The courses the learner keeps added, as the roadmap saves them: refunded ones are gone. */
function addedIds(roadmap: readonly RoadmapCourse[]): readonly string[] {
  return roadmap.filter((course) => course.status !== 'revoked').map((course) => course.courseId);
}

/** The most courses a learner adds to their path, as the server keeps them. */
const MOST_ADDED = 3;

/**
 * The added courses once one more is added, or `null` when the path already holds the most
 * the server keeps.
 */
export function withAdded(
  roadmap: readonly RoadmapCourse[],
  courseId: string,
): readonly string[] | null {
  const kept = addedIds(roadmap);
  if (kept.includes(courseId)) {
    return kept;
  }
  return kept.length >= MOST_ADDED ? null : [...kept, courseId];
}

/** Whether a module can still be taken out of the path: never once it is paid for. */
export function removable(course: PlannedCourse): boolean {
  return course.kind === 'free' || (course.payment !== 'paid' && course.enrolment === 'none');
}

/** A course of the catalogue offered for the path, in the step it would take. */
export interface Suggestion {
  readonly course: CatalogueCourse;
  readonly stage: PathwayStage;
}

const STAGES: readonly PathwayStage[] = ['understand', 'apply', 'strengthen'];

/**
 * A few courses of the catalogue for each step of the path that it does not have yet, in the
 * catalogue's own order (the reader's language first); a step is the one its level fits.
 */
export function suggestions(
  catalogue: readonly CatalogueCourse[],
  inPath: ReadonlySet<string>,
  perStage: number,
): readonly Suggestion[] {
  const fresh = catalogue
    .filter((course) => !inPath.has(course.id))
    .map((course) => ({ course, stage: stageOfLevel(course.level) }));
  return STAGES.flatMap((stage) => fresh.filter((item) => item.stage === stage).slice(0, perStage));
}
