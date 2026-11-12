import type { CatalogueSearchRequest, Region } from '@rewire/contracts';
import { useMutation, useQuery } from '@tanstack/react-query';

import { api, STATIC } from './instance.ts';

/** Every course of the region, read again after a payment like any other enrolment. */
export function useCourseCatalogue(region: Region, language: 'en' | 'es') {
  return useQuery({
    queryKey: ['course-catalogue', region, language],
    queryFn: ({ signal }) => api.courseCatalogue(region, language, signal),
  });
}

/** Where the listed courses come from; it changes only with a new release. */
export function useCourseSources() {
  return useQuery({
    queryKey: ['course-sources'],
    queryFn: ({ signal }) => api.courseSources(signal),
    ...STATIC,
  });
}

/** One question to the course guide. What the person wrote is answered and not kept. */
export function useCourseSearch() {
  return useMutation({
    mutationFn: (body: CatalogueSearchRequest) => api.searchCourses(body),
  });
}
