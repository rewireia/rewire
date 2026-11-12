import { z } from 'zod';

import type { Clock } from '../../platform/clock.ts';
import type { Database, Statement } from '../../platform/database.ts';

type EnrolmentState = 'active' | 'completed' | 'revoked';

/** A learner's access to a course. */
export interface Enrolment {
  readonly id: string;
  readonly learnerId: string;
  readonly courseId: string;
  readonly orderId: string;
  readonly status: EnrolmentState;
  readonly startedAt: string;
  readonly quizPassedAt: string | undefined;
  readonly completedAt: string | undefined;
  /** Ids of the lessons the learner has marked as done. */
  readonly completedLessons: ReadonlySet<string>;
  readonly certificateId: string | undefined;
}

/** A certificate as it was issued. It never changes afterwards. */
export interface IssuedCertificate {
  readonly id: string;
  readonly enrolmentId: string;
  readonly learnerName: string;
  readonly courseId: string;
  readonly courseTitle: string;
  readonly hours: number;
  /** Day of issue, as `YYYY-MM-DD`. */
  readonly issuedOn: string;
}

type NewCertificate = Omit<IssuedCertificate, 'issuedOn'>;

const enrolmentRowSchema = z.object({
  id: z.string(),
  learner_id: z.string(),
  course_id: z.string(),
  order_id: z.string(),
  status: z.enum(['active', 'completed', 'revoked']),
  started_at: z.string(),
  quiz_passed_at: z.string().nullable(),
  completed_at: z.string().nullable(),
  certificate_id: z.string().nullable(),
  /** The completed lessons, as a JSON array built by SQLite. */
  lessons: z.string(),
});

const certificateRowSchema = z.object({
  id: z.string(),
  enrolment_id: z.string(),
  learner_name: z.string(),
  course_id: z.string(),
  course_title: z.string(),
  hours: z.number(),
  issued_on: z.string(),
});

const lessonIdsSchema = z.array(z.string());

/** Every column of an enrolment, with its lessons and certificate, in one row. */
const ENROLMENT_SELECT = `
  SELECT e.id, e.learner_id, e.course_id, e.order_id, e.status, e.started_at,
         e.quiz_passed_at, e.completed_at, c.id AS certificate_id,
         (SELECT json_group_array(p.lesson_id) FROM lesson_progress p
           WHERE p.enrolment_id = e.id) AS lessons
    FROM enrolments e
    LEFT JOIN certificates c ON c.enrolment_id = e.id`;

const CERTIFICATE_COLUMNS =
  'id, enrolment_id, learner_name, course_id, course_title, hours, issued_on';

/**
 * Enrolments and what the learner does with them. Enrolments are created and revoked by
 * the order store, with the payment; this store records the learning. Every write can be
 * repeated without changing the outcome.
 */
export interface EnrolmentStore {
  find(learnerId: string, courseId: string): Promise<Enrolment | undefined>;
  listByLearner(learnerId: string): Promise<Enrolment[]>;
  completeLesson(enrolmentId: string, lessonId: string): Promise<void>;
  /** Records a passed quiz and completes the course, in one transaction. */
  recordQuizPassed(enrolmentId: string): Promise<void>;
  /**
   * Issues a certificate unless the enrolment has one. Returns the enrolment's certificate,
   * or `undefined` when the id was already taken by another one and nothing was written.
   */
  issueCertificate(certificate: NewCertificate): Promise<IssuedCertificate | undefined>;
  findCertificate(id: string): Promise<IssuedCertificate | undefined>;
}

export function createEnrolmentStore(database: Database, clock: Clock): EnrolmentStore {
  const findCertificateWhere = async (column: string, value: string) => {
    const result = await database.execute(
      `SELECT ${CERTIFICATE_COLUMNS} FROM certificates WHERE ${column} = ?`,
      [value],
    );
    const row = result.rows[0];
    return row === undefined ? undefined : certificateOf(certificateRowSchema.parse(row));
  };

  return {
    async find(learnerId, courseId) {
      const result = await database.execute(
        `${ENROLMENT_SELECT} WHERE e.learner_id = ? AND e.course_id = ?`,
        [learnerId, courseId],
      );
      const row = result.rows[0];
      return row === undefined ? undefined : enrolmentOf(enrolmentRowSchema.parse(row));
    },

    async listByLearner(learnerId) {
      const result = await database.execute(
        `${ENROLMENT_SELECT} WHERE e.learner_id = ? ORDER BY e.started_at`,
        [learnerId],
      );
      return result.rows.map((row) => enrolmentOf(enrolmentRowSchema.parse(row)));
    },

    async completeLesson(enrolmentId, lessonId) {
      await database.execute(
        `INSERT OR IGNORE INTO lesson_progress (enrolment_id, lesson_id, completed_at)
         VALUES (?, ?, ?)`,
        [enrolmentId, lessonId, clock().toISOString()],
      );
    },

    async recordQuizPassed(enrolmentId) {
      await database.batch(quizPassedStatements(enrolmentId, clock().toISOString()), 'write');
    },

    async issueCertificate(certificate) {
      // Both unique keys, the id and the enrolment, make a second issue a no-op.
      await database.execute(insertCertificate(certificate, clock()));
      return findCertificateWhere('enrolment_id', certificate.enrolmentId);
    },

    findCertificate: (id) => findCertificateWhere('id', id),
  };
}

/** A passed quiz completes the course. The first pass is the one kept. */
function quizPassedStatements(enrolmentId: string, at: string): Statement[] {
  return [
    {
      sql: `UPDATE enrolments SET quiz_passed_at = COALESCE(quiz_passed_at, ?)
             WHERE id = ? AND status IN ('active', 'completed')`,
      args: [at, enrolmentId],
    },
    {
      sql: `UPDATE enrolments SET status = 'completed', completed_at = ?
             WHERE id = ? AND status = 'active'`,
      args: [at, enrolmentId],
    },
  ];
}

function insertCertificate(certificate: NewCertificate, now: Date): Statement {
  return {
    sql: `INSERT OR IGNORE INTO certificates (${CERTIFICATE_COLUMNS}) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    args: [
      certificate.id,
      certificate.enrolmentId,
      certificate.learnerName,
      certificate.courseId,
      certificate.courseTitle,
      certificate.hours,
      now.toISOString().slice(0, 'YYYY-MM-DD'.length),
    ],
  };
}

function enrolmentOf(row: z.infer<typeof enrolmentRowSchema>): Enrolment {
  const lessons: unknown = JSON.parse(row.lessons);
  return {
    id: row.id,
    learnerId: row.learner_id,
    courseId: row.course_id,
    orderId: row.order_id,
    status: row.status,
    startedAt: row.started_at,
    quizPassedAt: row.quiz_passed_at ?? undefined,
    completedAt: row.completed_at ?? undefined,
    completedLessons: new Set(lessonIdsSchema.parse(lessons)),
    certificateId: row.certificate_id ?? undefined,
  };
}

function certificateOf(row: z.infer<typeof certificateRowSchema>): IssuedCertificate {
  return {
    id: row.id,
    enrolmentId: row.enrolment_id,
    learnerName: row.learner_name,
    courseId: row.course_id,
    courseTitle: row.course_title,
    hours: row.hours,
    issuedOn: row.issued_on,
  };
}
