import { LISTED_SOURCES, REGION_PROFILES } from '@rewire/content';
import type {
  CatalogueCourse,
  CatalogueSearchRequest,
  CatalogueSearchResult,
  CourseCatalogue,
  EnrolmentStatus,
  Region,
} from '@rewire/contracts';

import type { OrderStore } from '../checkout/order-store.ts';
import type { GuideModel } from '../guide/model.ts';
import type { EnrolmentStore } from '../learning/enrolment-store.ts';
import type { Marketplace } from '../marketplace/service.ts';
import { enrolmentStatuses } from '../pathway/pathway.ts';

import { staticCard, topicsIn, type CatalogueLanguage } from './cards.ts';
import { chooseCourses } from './course-guide.ts';
import { searchCourses } from './search-index.ts';

/** How many courses the server hands the model to choose from. */
const CANDIDATES = 24;

interface CourseCatalogueDependencies {
  readonly marketplace: Pick<Marketplace, 'catalogue'>;
  readonly enrolments: Pick<EnrolmentStore, 'listByLearner'>;
  readonly orders: Pick<OrderStore, 'listByLearner'>;
  /** The guide's model, already within the guide's daily budget; none runs on rules alone. */
  readonly model: GuideModel | undefined;
}

/** The course catalogue of a region, and the guide that searches it in a person's words. */
export interface CourseCatalogueService {
  catalogue(
    region: Region,
    language: CatalogueLanguage,
    learnerId: string | undefined,
  ): Promise<CourseCatalogue>;
  search(request: CatalogueSearchRequest): Promise<CatalogueSearchResult>;
}

/** The courses offered in a language before the others, each group in the catalogue order. */
function inLanguageFirst(courses: CatalogueCourse[], language: CatalogueLanguage) {
  const offered = (course: CatalogueCourse) => Number(!course.languages.includes(language));
  return courses.toSorted((a, b) => offered(a) - offered(b));
}

export function createCourseCatalogue(
  dependencies: CourseCatalogueDependencies,
): CourseCatalogueService {
  const { marketplace, enrolments, orders, model } = dependencies;

  /** A visitor has no enrolment and no payment, so every course reads `none`. */
  const standingOf = async (learnerId: string | undefined) => {
    if (learnerId === undefined) return (): EnrolmentStatus => 'none';
    const [learnerEnrolments, learnerOrders] = await Promise.all([
      enrolments.listByLearner(learnerId),
      orders.listByLearner(learnerId),
    ]);
    const pending = learnerOrders.filter((order) => order.status === 'pending');
    return enrolmentStatuses(learnerEnrolments, new Set(pending.map((order) => order.courseId)));
  };

  /** The ids of the courses on sale in a region, in the order of the catalogue. */
  const publishedIn = async (region: Region) =>
    (await marketplace.catalogue(region)).filter((course) => course.published);

  return {
    async catalogue(region, language, learnerId) {
      const [terms, standing] = await Promise.all([publishedIn(region), standingOf(learnerId)]);
      const currency = REGION_PROFILES[region].currency;
      const courses = terms.flatMap((term): CatalogueCourse[] => {
        const card = staticCard(term.courseId, language);
        return card === undefined
          ? []
          : [
              {
                ...card,
                price: { currency, minorUnits: term.priceMinor },
                offer: term.offer,
                enrolment: standing(card.id),
              },
            ];
      });
      const shown = new Set(courses.flatMap((course) => course.topics));
      const providers = new Set(courses.map((course) => course.provider));
      return {
        region,
        courses: inLanguageFirst(courses, language),
        topics: topicsIn(language).filter((topic) => shown.has(topic.id)),
        providers: [...providers].toSorted(),
        sources: LISTED_SOURCES.filter((source) => providers.has(source.provider)),
      };
    },

    async search({ region, language, query, exclude }) {
      const excluded = new Set(exclude);
      const allowed = new Set(
        (await publishedIn(region)).map((term) => term.courseId).filter((id) => !excluded.has(id)),
      );
      const candidates = searchCourses(query, allowed, CANDIDATES).flatMap((id) => {
        const card = staticCard(id, language);
        return card === undefined ? [] : [card];
      });
      const topicLabels = new Map(topicsIn(language).map((topic) => [topic.id, topic.label]));
      return chooseCourses(model, { query, language, candidates, topicLabels });
    },
  };
}
