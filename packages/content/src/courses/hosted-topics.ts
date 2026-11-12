import type { TopicId } from '../schema/listed-course.ts';

/** The subjects of each course Rewire hosts, so that they sit in the same catalogue filters. */
export const HOSTED_COURSE_TOPICS: Readonly<Record<string, readonly TopicId[]>> = {
  'ai-foundations': ['ai-foundations'],
  'ai-for-office-work': ['ai-at-work', 'productivity-and-collaboration'],
  'ai-for-professionals': ['ai-at-work', 'data-analytics'],
  'ai-for-managers': ['business-management', 'ai-at-work'],
  'ai-for-service-and-sales': ['ai-at-work', 'marketing-sales'],
  'ai-for-technicians-and-trades': ['ai-at-work'],
  'checking-ai-work': ['responsible-ai', 'ai-at-work'],
};
