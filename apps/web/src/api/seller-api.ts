import {
  discountBeaconListSchema,
  discountBeaconSchema,
  sellerCourseListSchema,
  sellerCourseSchema,
  type DiscountBeaconInput,
  type Region,
  type SellerCourseInput,
} from '@rewire/contracts';

import { segment, sendJson, type Request } from './request.ts';

/** The seller's own courses and its discount beacons. */
export function sellerApi(request: Request) {
  return {
    sellerCourses: (region: Region, signal?: AbortSignal) =>
      request(`/business/courses?${new URLSearchParams({ region })}`, sellerCourseListSchema, {
        signal: signal ?? null,
      }),
    publishCourse: (body: SellerCourseInput) =>
      request('/business/courses', sellerCourseSchema, sendJson('POST', body)),
    updateCourse: (id: string, body: SellerCourseInput) =>
      request(`/business/courses/${segment(id)}`, sellerCourseSchema, sendJson('PUT', body)),
    beacons: (region: Region, signal?: AbortSignal) =>
      request(`/business/beacons?${new URLSearchParams({ region })}`, discountBeaconListSchema, {
        signal: signal ?? null,
      }),
    startBeacon: (body: DiscountBeaconInput) =>
      request('/business/beacons', discountBeaconSchema, sendJson('POST', body)),
    cancelBeacon: (id: string) =>
      request(`/business/beacons/${segment(id)}/cancel`, discountBeaconSchema, sendJson('POST')),
  };
}
