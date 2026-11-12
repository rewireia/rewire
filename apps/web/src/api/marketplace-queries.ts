import type { Region } from '@rewire/contracts';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './instance.ts';

export function useWallet(region: Region, enabled = true) {
  return useQuery({
    queryKey: ['wallet', region],
    queryFn: ({ signal }) => api.wallet(region, signal),
    enabled,
  });
}
export function useCatalogue(region: Region, enabled = true) {
  return useQuery({
    queryKey: ['market-catalogue', region],
    queryFn: ({ signal }) => api.catalogue(region, signal),
    enabled,
  });
}
export function useSetTerms() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({
      courseId,
      ...body
    }: {
      courseId: string;
      region: Region;
      priceMinor: number;
      published: boolean;
    }) => api.setTerms(courseId, body),
    onSuccess: () =>
      Promise.all([
        client.invalidateQueries({ queryKey: ['market-catalogue'] }),
        // The shop shows only what is on sale, at the seller's price.
        client.invalidateQueries({ queryKey: ['course-catalogue'] }),
      ]),
  });
}
export function useSales(enabled = true) {
  return useQuery({
    queryKey: ['market-sales'],
    queryFn: ({ signal }) => api.sales(signal),
    enabled,
  });
}
