import type { LearnerProfile, PersonalExposureRequest, Region } from '@rewire/contracts';
import {
  keepPreviousData,
  skipToken,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';

import { api, STATIC } from './instance.ts';

/** Results shown under the search field. */
const SEARCH_LIMIT = 6;

export function useOccupationSearch(
  region: Region,
  query: string,
  language: string,
  limit = SEARCH_LIMIT,
) {
  const trimmed = query.trim();
  return useQuery({
    queryKey: ['occupations', region, trimmed, language, limit],
    queryFn:
      trimmed.length < 2
        ? skipToken
        : ({ signal }) =>
            api.searchOccupations({ region, query: trimmed, limit, language }, signal),
    placeholderData: keepPreviousData,
    ...STATIC,
  });
}

export function useUnitGroups() {
  return useQuery({
    queryKey: ['unit-groups'],
    queryFn: ({ signal }) => api.unitGroups(signal),
    ...STATIC,
  });
}

export function useReport(isco08: string | null) {
  return useQuery({
    queryKey: ['report', isco08],
    queryFn: isco08 === null ? skipToken : ({ signal }) => api.report(isco08, signal),
    ...STATIC,
  });
}

/**
 * The exposure of the person's week. A new answer cancels the request before it: the signal
 * aborts as soon as the query key changes.
 */
export function usePersonalExposure(isco08: string, request: PersonalExposureRequest | null) {
  return useQuery({
    queryKey: ['personal-exposure', isco08, request],
    queryFn:
      request === null ? skipToken : ({ signal }) => api.personalExposure(isco08, request, signal),
    placeholderData: keepPreviousData,
    ...STATIC,
  });
}

export function useTaskTranslations(isco08: string | null, language: string) {
  return useQuery({
    queryKey: ['task-translations', isco08, language],
    retry: false,
    refetchOnWindowFocus: false,
    queryFn:
      isco08 === null || language !== 'es'
        ? skipToken
        : ({ signal }) => api.taskTranslations(isco08, signal),
    ...STATIC,
  });
}

export function useSources() {
  return useQuery({
    queryKey: ['sources'],
    queryFn: ({ signal }) => api.sources(signal),
    ...STATIC,
  });
}

export function useRegions() {
  return useQuery({
    queryKey: ['regions'],
    queryFn: ({ signal }) => api.regions(signal),
    ...STATIC,
  });
}

export function useOccupation(region: Region, code: string, isco08: string | null) {
  return useQuery({
    queryKey: ['occupation', region, code, isco08],
    queryFn: ({ signal }) => api.occupation(region, code, isco08, signal),
    ...STATIC,
  });
}

export function useLabour(region: Region, code: string | null, isco08: string) {
  return useQuery({
    queryKey: ['labour', region, code, isco08],
    queryFn: ({ signal }) => api.labour(region, code, isco08, signal),
    ...STATIC,
  });
}

export function useSession() {
  return useQuery({ queryKey: ['session'], queryFn: ({ signal }) => api.session(signal) });
}

/** Saves the learner's profile; the answer is the session it now belongs to. */
export function useSaveProfile() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (profile: LearnerProfile) => api.saveProfile(profile),
    onSuccess: (session) => {
      client.setQueryData(['session'], session);
    },
  });
}
