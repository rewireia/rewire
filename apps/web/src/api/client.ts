import {
  dataSourceListSchema,
  exposureReportSchema,
  occupationDetailSchema,
  occupationLabourSchema,
  occupationSearchResultSchema,
  personalExposureSchema,
  regionListSchema,
  sessionSchema,
  taskRationaleSchema,
  taskTranslationsSchema,
  unitGroupListSchema,
  type DataSourceList,
  type ExposureReport,
  type LearnerProfile,
  type OccupationDetail,
  type OccupationLabour,
  type OccupationSearchResult,
  type PersonalExposure,
  type PersonalExposureRequest,
  type Region,
  type RegionList,
  type Session,
  type TaskRationale,
  type UnitGroupList,
} from '@rewire/contracts';

import { accessApi } from './access-api.ts';
import { marketplaceApi } from './marketplace-api.ts';
import { coursesApi } from './courses-api.ts';
import { commerceApi } from './commerce-api.ts';
import { guideApi } from './guide-api.ts';
import { learningApi } from './learning-api.ts';
import { insightsApi } from './insights-api.ts';
import { libraryApi } from './library-api.ts';
import { offersApi } from './offers-api.ts';
import { requester, segment, sendJson, type Request } from './request.ts';
import { studioApi } from './studio-api.ts';
import { studyPlanApi } from './study-plan-api.ts';
import { walletApi } from './wallet-api.ts';
import { sellerApi } from './seller-api.ts';

interface SearchParams {
  readonly region: Region;
  readonly query: string;
  readonly limit: number;
  readonly language: string;
}

const unitGroupPath = (isco08: string) => `/unit-groups/${segment(isco08)}`;
const optionalIsco = (isco08: string | null) =>
  isco08 === null ? '' : `?${new URLSearchParams({ isco08 })}`;

/** Occupations, exposure, regions and sources: what the report is made of. */
function exposureApi(request: Request) {
  return {
    searchOccupations(params: SearchParams, signal?: AbortSignal): Promise<OccupationSearchResult> {
      const query = new URLSearchParams({
        q: params.query,
        limit: String(params.limit),
        lang: params.language,
      });
      return request(
        `/regions/${params.region}/occupations?${query}`,
        occupationSearchResultSchema,
        { signal: signal ?? null },
      );
    },
    occupation(region: Region, code: string, isco08: string | null, signal?: AbortSignal) {
      const path = `/regions/${region}/occupations/${segment(code)}${optionalIsco(isco08)}`;
      return request<OccupationDetail>(path, occupationDetailSchema, { signal: signal ?? null });
    },
    /** Employment and pay; with no regional code, only the figures published by group. */
    labour(region: Region, code: string | null, isco08: string, signal?: AbortSignal) {
      const query = new URLSearchParams(code === null ? { isco08 } : { code, isco08 });
      const path = `/regions/${region}/labour?${query}`;
      return request<OccupationLabour>(path, occupationLabourSchema, { signal: signal ?? null });
    },
    regions(signal?: AbortSignal): Promise<RegionList> {
      return request('/regions', regionListSchema, { signal: signal ?? null });
    },
    unitGroups(signal?: AbortSignal): Promise<UnitGroupList> {
      return request('/unit-groups', unitGroupListSchema, { signal: signal ?? null });
    },
    report(isco08: string, signal?: AbortSignal): Promise<ExposureReport> {
      return request(unitGroupPath(isco08), exposureReportSchema, { signal: signal ?? null });
    },
    taskTranslations(isco08: string, signal?: AbortSignal) {
      return request(`${unitGroupPath(isco08)}/task-translations?lang=es`, taskTranslationsSchema, {
        signal: signal ?? null,
      });
    },
    personalExposure(
      isco08: string,
      body: PersonalExposureRequest,
      signal?: AbortSignal,
    ): Promise<PersonalExposure> {
      const path = `${unitGroupPath(isco08)}/personal-exposure`;
      return request(path, personalExposureSchema, sendJson('POST', body, signal));
    },
    rationale(isco08: string, taskId: string, signal?: AbortSignal): Promise<TaskRationale> {
      const path = `${unitGroupPath(isco08)}/tasks/${segment(taskId)}/rationale`;
      return request(path, taskRationaleSchema, { signal: signal ?? null });
    },
    sources(signal?: AbortSignal): Promise<DataSourceList> {
      return request('/sources', dataSourceListSchema, { signal: signal ?? null });
    },
  };
}

/** The session and the learner's saved profile. */
function sessionApi(request: Request) {
  return {
    session(signal?: AbortSignal): Promise<Session> {
      return request('/session', sessionSchema, { signal: signal ?? null });
    },
    saveProfile(profile: LearnerProfile): Promise<Session> {
      return request('/session/profile', sessionSchema, sendJson('PUT', profile));
    },
  };
}

/** A typed client of the Rewire API. Every answer is validated with the contracts. */
export function createApiClient(fetchFn: typeof fetch = fetch, base = '/api') {
  const request = requester(fetchFn, base);
  return {
    ...exposureApi(request),
    ...sessionApi(request),
    ...accessApi(request),
    ...marketplaceApi(request),
    ...walletApi(request),
    ...sellerApi(request),
    ...commerceApi(request),
    ...learningApi(request),
    ...studyPlanApi(request),
    ...guideApi(request),
    ...studioApi(request),
    ...coursesApi(request),
    ...insightsApi(request),
    ...libraryApi(request),
    ...offersApi(request),
  };
}
