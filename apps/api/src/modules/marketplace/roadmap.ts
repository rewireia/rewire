import { findSellableCourse, REGION_PROFILES } from '@rewire/content';
import { roadmapSchema, type Region } from '@rewire/contracts';
import { notFound } from '../../http/problem.ts';
import type { Database } from '../../platform/database.ts';
import { catalogue } from './catalogue.ts';
import { courseTitle } from './recommendations.ts';

/** Persist chosen courses independently of purchase. Never grants access. */
export async function saveRoadmap(
  database: Database,
  learnerId: string,
  region: Region,
  ids: string[],
  now = new Date(),
) {
  const terms = await catalogue(database, region, now);
  if (
    new Set(ids).size !== ids.length ||
    ids.some((id) => !terms.some((item) => item.courseId === id && item.published))
  )
    throw notFound('That course');
  await database.batch(
    [
      {
        sql: `DELETE FROM learning_roadmap WHERE learner_id = ? AND region = ? AND course_id NOT IN
      (SELECT course_id FROM enrolments WHERE learner_id = ? AND status IN ('active', 'completed'))`,
        args: [learnerId, region, learnerId],
      },
      ...ids.map((id) => ({
        sql: 'INSERT OR IGNORE INTO learning_roadmap VALUES (?, ?, ?)',
        args: [learnerId, region, id],
      })),
    ],
    'write',
  );
}

export async function roadmap(
  database: Database,
  learnerId: string,
  region: Region,
  language: string,
  now = new Date(),
) {
  const [terms, result] = await Promise.all([
    catalogue(database, region, now),
    database.execute({
      sql: `SELECT r.course_id, COALESCE(e.status, 'selected') status FROM
      (SELECT course_id FROM learning_roadmap WHERE learner_id = ? AND region = ?
       UNION SELECT e.course_id FROM enrolments e JOIN orders o ON o.id = e.order_id
         WHERE e.learner_id = ? AND o.region = ?) r
      LEFT JOIN enrolments e ON e.course_id = r.course_id AND e.learner_id = ?`,
      args: [learnerId, region, learnerId, region, learnerId],
    }),
  ]);
  const dates = { understand: '2027-01-04', apply: '2027-02-01', strengthen: '2027-03-01' };
  return roadmapSchema.parse({
    courses: result.rows
      .flatMap((row) => {
        const id = row['course_id'];
        if (typeof id !== 'string') throw new Error('Invalid roadmap course');
        const course = findSellableCourse(id);
        const item = terms.find((term) => term.courseId === id);
        return course && item
          ? [
              {
                courseId: id,
                title: courseTitle(id, course.title, language),
                date: dates[course.stage],
                hours: course.hours,
                status: row['status'],
                price: { currency: REGION_PROFILES[region].currency, minorUnits: item.priceMinor },
              },
            ]
          : [];
      })
      .sort((a, b) => a.date.localeCompare(b.date)),
  });
}
