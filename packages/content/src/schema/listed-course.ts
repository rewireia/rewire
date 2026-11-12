import { regionSchema } from '@rewire/data/schema';
import { z } from 'zod';

import { COURSE_TOPIC_IDS } from '../courses/topics.ts';

const slugSchema = z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'expected a lower-case slug');

/** Course ids also travel in orders and market terms, which allow up to 80 characters. */
const courseIdSchema = slugSchema.max(80);

export const courseLevelSchema = z.enum(['introductory', 'intermediate', 'advanced']);

export type CourseLevel = z.infer<typeof courseLevelSchema>;

/** What the provider asks for the course on its own site, as last checked. */
const providerAccessSchema = z.enum(['free', 'paid', 'unknown']);

const topicIdSchema = z.enum(COURSE_TOPIC_IDS);

export type TopicId = z.infer<typeof topicIdSchema>;

/**
 * A real course run by its provider. Rewire links to it and copies none of its syllabus,
 * lessons or logos; the title is the provider's own, so that the course can be found there.
 */
export const listedCourseSchema = z.object({
  id: courseIdSchema,
  title: z.string().min(1),
  provider: z.string().min(1),
  url: z.url(),
  /** One or two sentences in English about what the course covers. */
  summary: z.string().min(1).max(400),
  /** The same in Spanish, when Rewire has it; otherwise the English one is shown. */
  summaryEs: z.string().min(1).max(400).nullable(),
  topics: z.array(topicIdSchema).min(1).max(3),
  level: courseLevelSchema,
  /** Hours the provider states, when it states them. */
  hours: z.number().positive().nullable(),
  /** Two-letter languages the provider offers the course in. */
  languages: z.array(z.string().regex(/^[a-z]{2}$/)).min(1),
  providerAccess: providerAccessSchema,
  /** Regions it is meant for. Empty when it is open to anyone. */
  regions: z.array(regionSchema),
  /** Day the course and its link were last read at the provider, as `YYYY-MM-DD`. */
  checkedOn: z.iso.date(),
});

export type ListedCourse = z.infer<typeof listedCourseSchema>;

/** A listed course chosen by hand, described in English and in Spanish. */
export const curatedCourseSchema = listedCourseSchema.extend({
  summaryEs: z.string().min(1).max(400),
});

export type CuratedCourse = z.infer<typeof curatedCourseSchema>;

/** The courses of one provider's public catalogue, as captured or exported on one day. */
export const catalogueSnapshotSchema = z.object({
  provider: z.string().min(1),
  /** The public address the snapshot was read from; null for an official export file. */
  source: z.url().nullable(),
  /** How the source asks to be cited, with the day of the data. */
  citation: z.string().min(1),
  capturedOn: z.iso.date(),
  providerAccess: providerAccessSchema,
  /** Regions its courses are sold in. Empty when they are sold in every region. */
  regions: z.array(regionSchema),
  courses: z.array(
    listedCourseSchema.omit({
      provider: true,
      providerAccess: true,
      regions: true,
      checkedOn: true,
    }),
  ),
});

export type CatalogueSnapshot = z.infer<typeof catalogueSnapshotSchema>;
