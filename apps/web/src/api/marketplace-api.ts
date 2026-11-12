import {
  courseRecommendationsSchema,
  roadmapSchema,
  type CourseSearchInput,
  marketCatalogueSchema,
  marketSalesSchema,
  walletSchema,
  type Region,
} from '@rewire/contracts';
import { z } from 'zod';
import { segment, sendJson, type Request } from './request.ts';

/** The wallet balance, the plan's training and the business catalogue. */
export function marketplaceApi(request: Request) {
  return {
    roadmap: (region: Region, language: string, signal?: AbortSignal) =>
      request(`/marketplace/roadmap?${new URLSearchParams({ region, language })}`, roadmapSchema, {
        signal: signal ?? null,
      }),
    saveRoadmap: (region: Region, courseIds: string[]) =>
      request(
        '/marketplace/roadmap',
        z.object({ saved: z.literal(true) }),
        sendJson('PUT', { region, courseIds }),
      ),
    recommendCourses: (body: CourseSearchInput) =>
      request('/marketplace/recommendations', courseRecommendationsSchema, sendJson('POST', body)),
    wallet: (region: Region, signal?: AbortSignal) =>
      request(`/marketplace/wallet?${new URLSearchParams({ region })}`, walletSchema, {
        signal: signal ?? null,
      }),
    catalogue: (region: Region, signal?: AbortSignal) =>
      request(`/business/catalogue?${new URLSearchParams({ region })}`, marketCatalogueSchema, {
        signal: signal ?? null,
      }),
    setTerms: (
      courseId: string,
      body: { region: Region; priceMinor: number; published: boolean },
    ) =>
      request(
        `/business/catalogue/${segment(courseId)}`,
        marketCatalogueSchema.shape.courses.element,
        sendJson('PUT', { ...body, courseId }),
      ),
    sales: (signal?: AbortSignal) =>
      request('/business/sales', marketSalesSchema, { signal: signal ?? null }),
  };
}
