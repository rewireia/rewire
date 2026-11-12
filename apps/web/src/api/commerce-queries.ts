import type { Region, SponsorshipRequest } from '@rewire/contracts';
import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';

import { api } from './instance.ts';
import { useSession } from './queries.ts';

export function usePathway(region: Region, isco08: string) {
  return useQuery({
    queryKey: ['pathway', region, isco08],
    queryFn: ({ signal }) => api.pathway(region, isco08, signal),
  });
}

export function useCourse(region: Region, courseId: string) {
  return useQuery({
    queryKey: ['course', region, courseId],
    queryFn: ({ signal }) => api.course(region, courseId, signal),
  });
}

export function usePaymentConfig(region: Region) {
  return useQuery({
    queryKey: ['payment-config', region],
    queryFn: ({ signal }) => api.paymentConfig(region, signal),
  });
}

export function usePayments() {
  const session = useSession();
  return useQuery({
    queryKey: ['payments'],
    queryFn: ({ signal }) => api.payments(signal),
    enabled: session.data?.accessRole === 'learner',
  });
}

export function useSponsorships() {
  return useQuery({
    queryKey: ['sponsorships'],
    queryFn: ({ signal }) => api.sponsorships(signal),
  });
}

/** After money moves, everything that shows an enrolment or a payment is read again. */
export function refreshLearnerData(client: QueryClient): Promise<void> {
  return Promise.all(
    [
      'session',
      'roadmap',
      'payments',
      'wallet',
      'training-courses',
      'market-sales',
      'sponsorships',
      'enrolments',
      'course',
      'pathway',
      'content',
      'study-plan',
      'course-catalogue',
    ].map((key) => client.invalidateQueries({ queryKey: [key] })),
  ).then(() => undefined);
}

export function useRefundPayment() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (orderId: string) => api.refundPayment(orderId),
    onSettled: () => refreshLearnerData(client),
  });
}

export function useRefreshPayment() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (orderId: string) => api.refreshPayment(orderId),
    onSettled: () => refreshLearnerData(client),
  });
}

export function useRequestSponsorship() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (body: SponsorshipRequest) => api.requestSponsorship(body),
    onSettled: () => refreshLearnerData(client),
  });
}

export function useCancelSponsorship() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.cancelSponsorship(id),
    // Whether it was cancelled now or had already closed, the table is read again.
    onSettled: () => refreshLearnerData(client),
  });
}

export function useRefreshSponsorship() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.refreshSponsorship(id),
    onSettled: () => refreshLearnerData(client),
  });
}
