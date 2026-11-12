import type { DemoCourse } from '../../schema/course.ts';

import { AI_FOR_MANAGERS } from './ai-for-managers.ts';
import { AI_FOR_OFFICE_WORK } from './ai-for-office-work.ts';
import { AI_FOR_PROFESSIONALS } from './ai-for-professionals.ts';
import { AI_FOR_SERVICE_AND_SALES } from './ai-for-service-and-sales.ts';
import { AI_FOR_TECHNICIANS_AND_TRADES } from './ai-for-technicians-and-trades.ts';
import { AI_FOUNDATIONS } from './ai-foundations.ts';
import { CHECKING_AI_WORK } from './checking-ai-work.ts';

/** The demonstration catalogue of paid courses, in the order of the learning plan. */
export const DEMO_COURSES: readonly DemoCourse[] = [
  AI_FOUNDATIONS,
  AI_FOR_OFFICE_WORK,
  AI_FOR_PROFESSIONALS,
  AI_FOR_MANAGERS,
  AI_FOR_SERVICE_AND_SALES,
  AI_FOR_TECHNICIANS_AND_TRADES,
  CHECKING_AI_WORK,
];
