import { findSellableCourse } from '@rewire/content';
import {
  studyPlanSchema,
  type EnrolmentStatus,
  type Region,
  type RoadmapCourse,
  type StudyPlan,
} from '@rewire/contracts';
import { z } from 'zod';

import type { Clock } from '../../platform/clock.ts';
import type { Database } from '../../platform/database.ts';
import { roadmap } from '../marketplace/roadmap.ts';

import type { ChosenCourse } from './timeline.ts';

const planRowSchema = z.object({ plan: z.string() });

/** Reads and writes the plan each learner keeps: one, replaced whole on every save. */
export interface StudyPlanStore {
  /**
   * The learner's plan, or `undefined` when they have none. A plan saved under rules that
   * have since changed counts as none, so the learner starts again instead of being stuck.
   */
  find(learnerId: string): Promise<StudyPlan | undefined>;
  save(learnerId: string, plan: StudyPlan): Promise<void>;
  /** The courses the learner chose from the catalogue in a region, each in the step it fits. */
  chosen(learnerId: string, region: Region): Promise<readonly ChosenCourse[]>;
}

const ENROLMENT_OF: Record<RoadmapCourse['status'], EnrolmentStatus> = {
  selected: 'none',
  revoked: 'none',
  active: 'active',
  completed: 'completed',
};

/** A course of the roadmap as the plan takes it, with the step of the catalogue it fits. */
function chosenCourse(course: RoadmapCourse): ChosenCourse[] {
  const sellable = findSellableCourse(course.courseId);
  return sellable === undefined
    ? []
    : [
        {
          id: course.courseId,
          title: course.title,
          stage: sellable.stage,
          hours: course.hours,
          price: course.price,
          enrolment: ENROLMENT_OF[course.status],
        },
      ];
}

export function createStudyPlanStore(database: Database, clock: Clock): StudyPlanStore {
  return {
    async find(learnerId) {
      const result = await database.execute('SELECT plan FROM study_plans WHERE learner_id = ?', [
        learnerId,
      ]);
      const row = result.rows[0];
      if (row === undefined) {
        return undefined;
      }
      const stored: unknown = JSON.parse(planRowSchema.parse(row).plan);
      const plan = studyPlanSchema.safeParse(stored);
      return plan.success ? plan.data : undefined;
    },

    async save(learnerId, plan) {
      await database.execute(
        `INSERT INTO study_plans (learner_id, plan, updated_at) VALUES (?, ?, ?)
         ON CONFLICT (learner_id) DO UPDATE
           SET plan = excluded.plan, updated_at = excluded.updated_at`,
        [learnerId, JSON.stringify(plan), clock().toISOString()],
      );
    },

    async chosen(learnerId, region) {
      const { courses } = await roadmap(database, learnerId, region, 'en', clock());
      return courses.flatMap(chosenCourse);
    },
  };
}
