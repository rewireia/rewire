import type { RoadmapCourse } from '@rewire/contracts';

/**
 * The courses to keep when one chosen course is taken out of the plan: every other course still
 * in it, possibly none. The server never takes out a course already bought.
 */
export function withoutCourse(
  courses: readonly RoadmapCourse[],
  courseId: string,
): readonly string[] {
  return courses
    .filter((course) => course.status !== 'revoked' && course.courseId !== courseId)
    .map((course) => course.courseId);
}
