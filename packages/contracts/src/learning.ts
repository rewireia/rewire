import { z } from 'zod';

import { pathwayStageSchema } from './catalogue.ts';
import { exposureTaskSchema } from './exposure.ts';

/** A piece of a lesson. */
export const lessonBlockSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('paragraph'), text: z.string() }),
  z.object({ type: z.literal('list'), items: z.array(z.string()) }),
  z.object({ type: z.literal('key-point'), text: z.string() }),
]);

export type LessonBlock = z.infer<typeof lessonBlockSchema>;

export const lessonSchema = z.object({
  id: z.string(),
  title: z.string(),
  minutes: z.number().int(),
  blocks: z.array(lessonBlockSchema),
  completed: z.boolean(),
});

export type Lesson = z.infer<typeof lessonSchema>;

/** A quiz question as the learner sees it: without the answer. */
export const quizQuestionSchema = z.object({
  id: z.string(),
  prompt: z.string(),
  options: z.array(z.string()),
});

/** A course the learner is enrolled in, with everything needed to study it. */
export const courseContentSchema = z.object({
  id: z.string(),
  title: z.string(),
  summary: z.string(),
  stage: pathwayStageSchema,
  hours: z.number(),
  status: z.enum(['active', 'completed']),
  lessons: z.array(lessonSchema),
  practice: z.object({
    title: z.string(),
    instructions: z.string(),
    /** Real tasks of the learner's occupation to practise on, most exposed first. */
    tasks: z.array(exposureTaskSchema),
  }),
  quiz: z.object({
    passMark: z.number().int(),
    questions: z.array(quizQuestionSchema),
    passed: z.boolean(),
  }),
  certificateId: z.string().nullable(),
});

export type CourseContent = z.infer<typeof courseContentSchema>;

const enrolmentLineSchema = z.object({
  courseId: z.string(),
  title: z.string(),
  status: z.enum(['active', 'completed']),
  quizPassed: z.boolean(),
  startedAt: z.iso.datetime(),
  completedAt: z.iso.datetime().nullable(),
  certificateId: z.string().nullable(),
});

/**
 * A line of the learner's dashboard. A hosted course is studied in Rewire, lesson by lesson; a
 * listed course is taken at its provider, so it has no stage, lessons, quiz or certificate here.
 */
export const enrolmentSchema = z.discriminatedUnion('kind', [
  enrolmentLineSchema.extend({
    kind: z.literal('hosted'),
    stage: pathwayStageSchema,
    lessonsCompleted: z.number().int(),
    lessons: z.number().int(),
    provider: z.null(),
    url: z.null(),
  }),
  enrolmentLineSchema.extend({
    kind: z.literal('listed'),
    stage: z.null(),
    lessonsCompleted: z.null(),
    lessons: z.null(),
    provider: z.string(),
    url: z.url(),
  }),
]);

export type Enrolment = z.infer<typeof enrolmentSchema>;

export const enrolmentListSchema = z.object({ enrolments: z.array(enrolmentSchema) });

export type EnrolmentList = z.infer<typeof enrolmentListSchema>;

export const quizSubmissionSchema = z.object({
  /** The option chosen for each question, in the order of the questions. */
  answers: z.array(z.number().int().nonnegative()).max(40),
});

export type QuizSubmission = z.infer<typeof quizSubmissionSchema>;

export const quizResultSchema = z.object({
  passed: z.boolean(),
  correct: z.number().int(),
  passMark: z.number().int(),
  questions: z.array(
    z.object({
      id: z.string(),
      correct: z.boolean(),
      correctOption: z.number().int(),
      explanation: z.string(),
    }),
  ),
});

export type QuizResult = z.infer<typeof quizResultSchema>;

export const certificateRequestSchema = z.object({
  /** The name to print on the certificate, as the learner writes it. */
  learnerName: z.string().trim().min(2).max(80),
});

export type CertificateRequest = z.infer<typeof certificateRequestSchema>;

/** A certificate anyone can verify with its id. */
export const certificateSchema = z.object({
  id: z.string(),
  learnerName: z.string(),
  courseTitle: z.string(),
  hours: z.number(),
  issuedOn: z.iso.date(),
  /** Says plainly that the course belongs to a demonstration catalogue. */
  demo: z.literal(true),
});

export type Certificate = z.infer<typeof certificateSchema>;
