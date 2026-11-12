import type { DiscountBeaconInput, Region, SellerCourseInput } from '@rewire/contracts';
import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';

import { api } from './instance.ts';

/** Everything a change of the seller's courses or prices shows somewhere else. */
const refreshSelling = (client: QueryClient) =>
  Promise.all(
    ['seller-courses', 'market-catalogue', 'course-catalogue', 'region-offer', 'beacons'].map(
      (key) => client.invalidateQueries({ queryKey: [key] }),
    ),
  );

export function useSellerCourses(region: Region) {
  return useQuery({
    queryKey: ['seller-courses', region],
    queryFn: ({ signal }) => api.sellerCourses(region, signal),
  });
}

export function usePublishCourse() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (body: SellerCourseInput) => api.publishCourse(body),
    onSuccess: () => refreshSelling(client),
  });
}

export function useUpdateCourse() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: SellerCourseInput }) =>
      api.updateCourse(id, body),
    onSuccess: () => refreshSelling(client),
  });
}

export function useBeacons(region: Region) {
  return useQuery({
    queryKey: ['beacons', region],
    queryFn: ({ signal }) => api.beacons(region, signal),
  });
}

export function useStartBeacon() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (body: DiscountBeaconInput) => api.startBeacon(body),
    onSuccess: () => refreshSelling(client),
  });
}

export function useCancelBeacon() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.cancelBeacon(id),
    onSuccess: () => refreshSelling(client),
  });
}
