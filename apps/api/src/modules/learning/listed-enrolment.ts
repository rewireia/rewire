import { findSellableCourse, type SellableCourse } from '@rewire/content';
import type { ListedEnrolment } from '@rewire/contracts';

import { notFound } from '../../http/problem.ts';

import type { LearningDependencies } from './learning-service.ts';

/** Where a listed course is taken: its provider's page, or the seller's own address. */
export function addressOf(
  { accessUrlOf }: Pick<LearningDependencies, 'accessUrlOf'>,
  course: SellableCourse,
): string | undefined {
  return course.url ?? accessUrlOf(course.id);
}

export async function listedEnrolment(
  dependencies: LearningDependencies,
  learnerId: string,
  courseId: string,
): Promise<ListedEnrolment> {
  const course = findSellableCourse(courseId);
  const enrolment = await dependencies.enrolments.find(learnerId, courseId);
  const url = course && addressOf(dependencies, course);
  if (
    course?.kind !== 'listed' ||
    url === undefined ||
    enrolment === undefined ||
    enrolment.status === 'revoked'
  ) {
    throw notFound('A listed course you are enrolled in with that id');
  }
  return {
    courseId: course.id,
    title: course.title,
    provider: course.provider,
    url,
    hours: course.hours,
    status: enrolment.status,
    startedAt: enrolment.startedAt,
  };
}
