import {
  COURSE_TOPIC_IDS,
  COURSE_TOPIC_LABELS,
  findSellableCourse,
  SELLABLE_COURSES,
  type SellableCourse,
} from '@rewire/content';
import type { CatalogueCourse, CourseTopic } from '@rewire/contracts';

import { courseSummary, courseTitle } from '../marketplace/recommendations.ts';

export type CatalogueLanguage = 'en' | 'es';

/** What a card says that depends on neither the region nor the learner. */
export type StaticCard = Omit<CatalogueCourse, 'price' | 'enrolment'>;

/**
 * The words of a card in a language. Rewire's own texts follow the language asked for; the
 * title of a listed course stays its provider's, and its summary is shown in Spanish when
 * there is one written in Spanish.
 */
function staticCardOf(course: SellableCourse, language: CatalogueLanguage): StaticCard {
  const hosted = course.kind === 'hosted';
  const summary = hosted
    ? courseSummary(course.id, course.title, course.summary, language)
    : language === 'es'
      ? (course.summaryEs ?? course.summary)
      : course.summary;
  return {
    id: course.id,
    kind: course.kind,
    title: hosted ? courseTitle(course.id, course.title, language) : course.title,
    provider: course.provider,
    url: course.url,
    summary,
    topics: [...course.topics],
    level: course.level,
    hours: course.hours,
    languages: [...course.languages],
    providerAccess: course.providerAccess,
    checkedOn: course.checkedOn,
  };
}

function cardsIn(language: CatalogueLanguage): ReadonlyMap<string, StaticCard> {
  return new Map(SELLABLE_COURSES.map((course) => [course.id, staticCardOf(course, language)]));
}

/** Every card of the content in both languages, worked out once when the server starts. */
const CARDS: Readonly<Record<CatalogueLanguage, ReadonlyMap<string, StaticCard>>> = {
  en: cardsIn('en'),
  es: cardsIn('es'),
};

/** A course's card; one the seller published is worked out from its latest version. */
export function staticCard(id: string, language: CatalogueLanguage): StaticCard | undefined {
  const known = CARDS[language].get(id);
  if (known !== undefined) return known;
  const course = findSellableCourse(id);
  return course && staticCardOf(course, language);
}

/** The subjects of the catalogue, named in a language, in their fixed order. */
export function topicsIn(language: CatalogueLanguage): CourseTopic[] {
  return COURSE_TOPIC_IDS.map((id) => ({ id, label: COURSE_TOPIC_LABELS[id][language] }));
}
