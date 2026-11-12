import { regionSchema } from '@rewire/data/schema';
import { z } from 'zod';

const slugSchema = z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'expected a lower-case slug');
const majorGroupSchema = z.string().regex(/^\d$/, 'expected one digit');

/** The three steps of every learning plan, in the order a person takes them. */
export const pathwayStageSchema = z.enum(['understand', 'apply', 'strengthen']);

export type PathwayStage = z.infer<typeof pathwayStageSchema>;

/** A piece of a lesson. Lessons are structured, so they render without parsing markup. */
export const lessonBlockSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('paragraph'), text: z.string().min(1) }),
  z.object({ type: z.literal('list'), items: z.array(z.string().min(1)).min(2) }),
  /** A point worth remembering, set apart from the text. */
  z.object({ type: z.literal('key-point'), text: z.string().min(1) }),
]);

export type LessonBlock = z.infer<typeof lessonBlockSchema>;

export const lessonSchema = z.object({
  id: slugSchema,
  title: z.string().min(1),
  minutes: z.number().int().positive(),
  blocks: z.array(lessonBlockSchema).min(1),
});

export type Lesson = z.infer<typeof lessonSchema>;

export const quizQuestionSchema = z
  .object({
    id: slugSchema,
    prompt: z.string().min(1),
    options: z.array(z.string().min(1)).min(3).max(4),
    /** Position of the right answer in `options`. */
    correctOption: z.number().int().nonnegative(),
    /** Shown after answering: why that option is right. */
    explanation: z.string().min(1),
  })
  .refine((question) => question.correctOption < question.options.length, {
    message: 'correctOption must point at one of the options',
  });

export type QuizQuestion = z.infer<typeof quizQuestionSchema>;

/**
 * A paid course of the demonstration catalogue. Rewire wrote it, and every screen that
 * shows it says it is a demo.
 */
export const demoCourseSchema = z
  .object({
    id: slugSchema,
    title: z.string().min(1),
    summary: z.string().min(1),
    stage: pathwayStageSchema,
    /** ISCO-08 major groups the course is written for. Empty when it suits every job. */
    majorGroups: z.array(majorGroupSchema),
    level: z.enum(['introductory', 'intermediate']),
    hours: z.number().positive(),
    /** What the learner will be able to do, one line each. */
    outcomes: z.array(z.string().min(1)).min(2),
    /** Price in the smallest unit of each currency, set per region rather than converted. */
    prices: z.object({
      USD: z.number().int().positive(),
      GBP: z.number().int().positive(),
      EUR: z.number().int().positive(),
    }),
    lessons: z.array(lessonSchema).min(2),
    /** An exercise the learner does on one of the real tasks of their own job. */
    practice: z.object({ title: z.string().min(1), instructions: z.string().min(1) }),
    quiz: z.object({
      /** Right answers needed to earn the certificate. */
      passMark: z.number().int().positive(),
      questions: z.array(quizQuestionSchema).min(3),
    }),
  })
  .refine((course) => course.quiz.passMark <= course.quiz.questions.length, {
    message: 'the pass mark cannot exceed the number of questions',
  });

export type DemoCourse = z.infer<typeof demoCourseSchema>;

/**
 * A free course run by someone else. Rewire links to it and describes it in its own
 * words: no syllabus, logo or text of the provider is copied.
 */
export const freeCourseSchema = z.object({
  id: slugSchema,
  title: z.string().min(1),
  provider: z.string().min(1),
  url: z.url(),
  summary: z.string().min(1),
  stage: pathwayStageSchema,
  /** Two-letter languages the provider offers the course in. */
  languages: z.array(z.string().regex(/^[a-z]{2}$/)).min(1),
  /** Hours the provider states, when it states them. */
  hours: z.number().positive().nullable(),
  /** Regions it is meant for. Empty when it is open to anyone. */
  regions: z.array(regionSchema),
  /** Day the link and the "free" claim were last checked, as `YYYY-MM-DD`. */
  checkedOn: z.iso.date(),
});

export type FreeCourse = z.infer<typeof freeCourseSchema>;
