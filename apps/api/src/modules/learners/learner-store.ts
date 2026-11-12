import { randomUUID } from 'node:crypto';

import { learnerProfileSchema, type LearnerProfile } from '@rewire/contracts';
import { z } from 'zod';

import type { Clock } from '../../platform/clock.ts';
import type { Database } from '../../platform/database.ts';

export interface Learner {
  readonly id: string;
  readonly profile: LearnerProfile | undefined;
  readonly certificateName: string | undefined;
}

const learnerRowSchema = z.object({
  id: z.string(),
  certificate_name: z.string().nullable(),
  region: z.string().nullable(),
  occupation_code: z.string().nullable(),
  occupation_title: z.string().nullable(),
  isco08: z.string().nullable(),
  time_by_task: z.string(),
});

/** Reads and writes learners. */
export interface LearnerStore {
  create(): Promise<Learner>;
  find(id: string): Promise<Learner | undefined>;
  /** The canonical demo learner, if anyone has claimed it. */
  demoId(): Promise<string | undefined>;
  /** Adopt the first signed-in learner; later sign-ins reuse that same identity. */
  claimDemo(id: string): Promise<string>;
  saveProfile(id: string, profile: LearnerProfile): Promise<void>;
  saveCertificateName(id: string, name: string): Promise<void>;
}

export function createLearnerStore(database: Database, clock: Clock): LearnerStore {
  return {
    async create() {
      const id = randomUUID();
      await database.execute('INSERT INTO learners (id, created_at) VALUES (?, ?)', [
        id,
        clock().toISOString(),
      ]);
      return { id, profile: undefined, certificateName: undefined };
    },

    async find(id) {
      const result = await database.execute(
        `SELECT id, certificate_name, region, occupation_code, occupation_title, isco08, time_by_task
           FROM learners WHERE id = ?`,
        [id],
      );
      const row = result.rows[0];
      return row === undefined ? undefined : learnerOf(learnerRowSchema.parse(row));
    },

    async demoId() {
      const result = await database.execute(
        "SELECT learner_id FROM demo_identity WHERE name = 'learner'",
      );
      return z.string().optional().parse(result.rows[0]?.['learner_id']);
    },
    async claimDemo(id) {
      await database.execute({
        sql: "INSERT OR IGNORE INTO demo_identity (name, learner_id) VALUES ('learner', ?)",
        args: [id],
      });
      const result = await database.execute(
        "SELECT learner_id FROM demo_identity WHERE name = 'learner'",
      );
      return z.string().parse(result.rows[0]?.['learner_id']);
    },
    async saveProfile(id, profile) {
      await database.execute(
        `UPDATE learners
            SET region = ?, occupation_code = ?, occupation_title = ?, isco08 = ?, time_by_task = ?
          WHERE id = ?`,
        [
          profile.region,
          profile.occupation.code,
          profile.occupation.title,
          profile.occupation.isco08,
          JSON.stringify(profile.timeByTask),
          id,
        ],
      );
    },

    async saveCertificateName(id, name) {
      await database.execute('UPDATE learners SET certificate_name = ? WHERE id = ?', [name, id]);
    },
  };
}

function learnerOf(row: z.infer<typeof learnerRowSchema>): Learner {
  const timeByTask: unknown = JSON.parse(row.time_by_task);
  const profile = learnerProfileSchema.safeParse({
    region: row.region,
    occupation: { code: row.occupation_code, title: row.occupation_title, isco08: row.isco08 },
    timeByTask,
  });
  return {
    id: row.id,
    // A learner who has bought nothing and confirmed no occupation has no profile yet.
    profile: profile.success ? profile.data : undefined,
    certificateName: row.certificate_name ?? undefined,
  };
}
