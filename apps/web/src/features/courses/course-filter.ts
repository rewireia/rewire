import type { CatalogueCourse, CourseLevel, CourseTopic } from '@rewire/contracts';

/** How long a course is, as its provider states it, in the ranges the filter offers. */
export type DurationRange = 'short' | 'medium' | 'long';

/** The limits of the ranges, in hours: up to 2, up to 10, and beyond. */
const SHORT_HOURS = 2;
const MEDIUM_HOURS = 10;

/** What the person asked the catalogue for; `null` is "any". */
export interface CourseFilter {
  readonly text: string;
  readonly topic: string | null;
  readonly level: CourseLevel | null;
  readonly provider: string | null;
  readonly duration: DurationRange | null;
  /** Only the courses a running offer of the seller takes money off. */
  readonly onOffer: boolean;
  /** A two-letter language the course must be offered in. */
  readonly language: string | null;
}

export const NO_FILTER: CourseFilter = {
  text: '',
  topic: null,
  level: null,
  provider: null,
  duration: null,
  onOffer: false,
  language: null,
};

/** Lower case and without accents, so that "diseno" finds "diseño". */
export function fold(text: string): string {
  return text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
}

/** The range of a course, or `null` when its provider does not state its hours. */
export function durationOf(hours: number | null): DurationRange | null {
  if (hours === null) {
    return null;
  }
  if (hours <= SHORT_HOURS) {
    return 'short';
  }
  return hours <= MEDIUM_HOURS ? 'medium' : 'long';
}

/** Everything the words of a search are looked for in. */
function searchableText(course: CatalogueCourse, topicLabels: ReadonlyMap<string, string>) {
  const topics = course.topics.map((id) => topicLabels.get(id) ?? '');
  return fold([course.title, course.summary, course.provider, ...topics].join(' '));
}

/** Whether a course meets every condition the person set. */
function matches(course: CatalogueCourse, filter: CourseFilter): boolean {
  return (
    (filter.topic === null || course.topics.includes(filter.topic)) &&
    (filter.level === null || course.level === filter.level) &&
    (filter.provider === null || course.provider === filter.provider) &&
    (filter.duration === null || durationOf(course.hours) === filter.duration) &&
    (!filter.onOffer || (course.offer ?? null) !== null) &&
    (filter.language === null || course.languages.includes(filter.language))
  );
}

/**
 * The courses that meet the filter, in the catalogue's order. Every word of the text must appear
 * in the title, the summary, the provider or a subject of the course.
 */
export function filterCourses(
  courses: readonly CatalogueCourse[],
  topics: readonly CourseTopic[],
  filter: CourseFilter,
): readonly CatalogueCourse[] {
  const words = fold(filter.text).split(/\s+/).filter(Boolean);
  const labels = new Map(topics.map((topic) => [topic.id, topic.label]));
  return courses.filter((course) => {
    if (!matches(course, filter)) {
      return false;
    }
    if (words.length === 0) {
      return true;
    }
    const text = searchableText(course, labels);
    return words.every((word) => text.includes(word));
  });
}

/** The languages of the interface that the catalogue offers courses in, in that order. */
export function catalogueLanguages(courses: readonly CatalogueCourse[]): readonly ('en' | 'es')[] {
  const offered = new Set(courses.flatMap((course) => course.languages));
  return (['en', 'es'] as const).filter((language) => offered.has(language));
}

/** Whether the person set any condition besides the language, which has its own control. */
export function isFiltered(filter: CourseFilter): boolean {
  return (
    filter.text.trim() !== '' ||
    filter.topic !== null ||
    filter.level !== null ||
    filter.provider !== null ||
    filter.duration !== null ||
    filter.onOffer
  );
}
