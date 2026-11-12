import {
  catalogueSearchResultSchema,
  courseCatalogueSchema,
  courseSourceListSchema,
  type CatalogueSearchRequest,
  type CatalogueSearchResult,
  type CourseCatalogue,
  type CourseSourceList,
  type Region,
} from '@rewire/contracts';

import { sendJson, type Request } from './request.ts';

/** The course catalogue of a region, and the guide that searches it in the person's words. */
export function coursesApi(request: Request) {
  return {
    courseCatalogue(
      region: Region,
      language: 'en' | 'es',
      signal?: AbortSignal,
    ): Promise<CourseCatalogue> {
      const path = `/regions/${region}/courses?${new URLSearchParams({ language })}`;
      return request(path, courseCatalogueSchema, { signal: signal ?? null });
    },
    courseSources(signal?: AbortSignal): Promise<CourseSourceList> {
      return request('/courses/sources', courseSourceListSchema, { signal: signal ?? null });
    },
    searchCourses(body: CatalogueSearchRequest): Promise<CatalogueSearchResult> {
      return request('/courses/search', catalogueSearchResultSchema, sendJson('POST', body));
    },
  };
}
