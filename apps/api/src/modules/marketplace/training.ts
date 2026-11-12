import { demoCoursesFor, findSellableCourse } from '@rewire/content';
import type { MarketCourse, Region, TrainingCourses } from '@rewire/contracts';
import type { Engine, ExposureProfile } from '@rewire/engine';
import { notFound } from '../../http/problem.ts';
import type { Database } from '../../platform/database.ts';
import { searchCourses } from '../courses/search-index.ts';
import { mostExposed } from '../exposure/task-focus.ts';
import { catalogue } from './catalogue.ts';

/** The most listed courses an occupation brings into its three-course plan. */
const LISTED_CANDIDATES = 30;

/**
 * ISCO-08 groups whose work is teaching: teaching professionals, education managers and
 * teachers' aides. Courses written for educators are proposed to them only.
 */
const TEACHING_GROUPS = ['23', '1345', '5312'] as const;

function teaches(isco08: string): boolean {
  return TEACHING_GROUPS.some((group) => isco08.startsWith(group));
}

/**
 * The listed courses most relevant to an occupation, best first: those the words of its title
 * and of its most exposed tasks name. Only courses that state their hours can be checked
 * against the learner's weekly time, so only those are offered; and a course about teaching a
 * subject is left out unless the occupation teaches.
 */
function relevantListed(exposure: ExposureProfile, offered: readonly MarketCourse[]): string[] {
  const allowed = new Set(
    offered
      .filter((course) => {
        const sellable = findSellableCourse(course.courseId);
        return (
          sellable?.kind === 'listed' &&
          sellable.hours !== null &&
          (teaches(exposure.isco08) || !sellable.topics.includes('education'))
        );
      })
      .map((course) => course.courseId),
  );
  const query = [exposure.title, ...mostExposed(exposure.tasks).map((task) => task.text)].join(' ');
  return searchCourses(query, allowed, LISTED_CANDIDATES);
}

/**
 * Published courses relevant to this occupation that do not already belong to the learner: the
 * hosted courses written for its major group, and the listed courses that fit it best.
 */
export async function eligibleCourses(
  database: Database,
  engine: Engine,
  learnerId: string,
  region: Region,
  isco08: string,
  now = new Date(),
) {
  const exposure = engine.exposureProfile(isco08);
  if (!exposure) throw notFound('That occupation');
  const [terms, occupied] = await Promise.all([
    catalogue(database, region, now),
    database.execute({
      sql: `SELECT course_id FROM enrolments WHERE learner_id = ? AND status IN ('active', 'completed')
        UNION SELECT course_id FROM purchase_holds WHERE learner_id = ?`,
      args: [learnerId, learnerId],
    }),
  ]);
  const taken = new Set(occupied.rows.map((row) => row['course_id']));
  const offered = terms.filter((course) => course.published && !taken.has(course.courseId));
  const relevant = new Set([
    ...demoCoursesFor(exposure.majorGroup.code).map((course) => course.id),
    ...relevantListed(exposure, offered),
  ]);
  return {
    occupation: exposure.title,
    terms: offered.filter((course) => relevant.has(course.courseId)),
  };
}

/** A learner sees the fixed price, and whether the wallet's balance covers it. */
export function presentTrainingCourses(
  terms: MarketCourse[],
  availableMinor: number,
): TrainingCourses {
  return {
    courses: terms.flatMap((item) => {
      const course = findSellableCourse(item.courseId);
      const hours = course?.hours ?? null;
      if (course === undefined || hours === null) return [];
      return [
        {
          courseId: course.id,
          title: course.title,
          summary: course.summary,
          currency: item.currency,
          priceMinor: item.priceMinor,
          affordable: item.priceMinor <= availableMinor,
          stage: course.stage,
          hours,
        },
      ];
    }),
  };
}
