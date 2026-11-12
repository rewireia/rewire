import { CURATED_COURSES, LISTED_COURSES, LISTED_SOURCES } from '@rewire/content';
import type { CourseSourceList } from '@rewire/contracts';

function countOf(provider: string): number {
  return LISTED_COURSES.filter((course) => course.provider === provider).length;
}

/** The courses checked by hand: how many, from how many providers, and the latest check. */
function handChecked(): CourseSourceList['sources'][number] {
  const days = CURATED_COURSES.map((course) => course.checkedOn).toSorted();
  return {
    kind: 'hand-checked',
    provider: null,
    source: null,
    citation: null,
    capturedOn: days.at(-1) ?? '',
    courses: CURATED_COURSES.length,
    providers: new Set(CURATED_COURSES.map((course) => course.provider)).size,
  };
}

/** Every origin of the listed courses, worked out once when the server starts. */
export const COURSE_SOURCES: CourseSourceList = {
  sources: [
    handChecked(),
    ...LISTED_SOURCES.map((entry) => ({
      kind: entry.source === null ? ('official-export' as const) : ('catalogue-api' as const),
      provider: entry.provider,
      source: entry.source,
      citation: entry.citation,
      capturedOn: entry.capturedOn,
      courses: countOf(entry.provider),
      providers: 1,
    })),
  ],
};
