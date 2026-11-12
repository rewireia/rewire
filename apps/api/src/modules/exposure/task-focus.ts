import type { ExposureTask, LearnerProfile } from '@rewire/contracts';
import type { ExposureProfile, ProfiledTask } from '@rewire/engine';

/** How many tasks a learning plan or a practice exercise puts in front of the learner. */
const FOCUS_SIZE = 3;

/**
 * The tasks of an occupation that the learner does, most exposed first. A task they said
 * takes none of their time is left out, but only when their saved profile is about this
 * same occupation: answers given for one job say nothing about another.
 */
export function tasksTheyDo(
  exposure: ExposureProfile,
  learnerProfile: LearnerProfile | undefined,
): readonly ProfiledTask[] {
  if (learnerProfile?.occupation.isco08 !== exposure.isco08) {
    return exposure.tasks;
  }
  const { timeByTask } = learnerProfile;
  return exposure.tasks.filter((task) => timeByTask[task.id] !== 'none');
}

/** The tasks AI can do most of, most exposed first. */
export function mostExposed(tasks: readonly ProfiledTask[]): ExposureTask[] {
  return tasks.slice(0, FOCUS_SIZE).map(presentTask);
}

/**
 * The tasks AI can do least of, least exposed first. A task already among the most exposed
 * is left out, so an occupation with few tasks shows each of them once.
 */
export function leastExposed(tasks: readonly ProfiledTask[]): ExposureTask[] {
  return tasks.slice(FOCUS_SIZE).slice(-FOCUS_SIZE).toReversed().map(presentTask);
}

function presentTask(task: ProfiledTask): ExposureTask {
  return { ...task, range: { ...task.range } };
}
