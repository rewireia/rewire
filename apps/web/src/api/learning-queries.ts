import type { Certificate, CertificateRequest, QuizSubmission } from '@rewire/contracts';
import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
  type UseMutationOptions,
} from '@tanstack/react-query';

import { refreshLearnerData } from './commerce-queries.ts';
import { api, STATIC } from './instance.ts';

export function useEnrolments() {
  return useQuery({ queryKey: ['enrolments'], queryFn: ({ signal }) => api.enrolments(signal) });
}

export function useCourseContent(courseId: string) {
  return useQuery({
    queryKey: ['content', courseId],
    queryFn: ({ signal }) => api.courseContent(courseId, signal),
    // A course the learner is not enrolled in is a 404: asking again will not change it.
    retry: false,
  });
}

/** A listed course the learner bought, asked only once the course is known not to be hosted. */
export function useListedEnrolment(courseId: string, enabled: boolean) {
  return useQuery({
    queryKey: ['listed-enrolment', courseId],
    queryFn: ({ signal }) => api.listedEnrolment(courseId, signal),
    enabled,
    // A course the learner is not enrolled in is a 404: asking again will not change it.
    retry: false,
  });
}

export function useCompleteLesson(courseId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (lessonId: string) => api.completeLesson(courseId, lessonId),
    onSettled: () => refreshLearnerData(client),
  });
}

export function useSubmitQuiz(courseId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (body: QuizSubmission) => api.submitQuiz(courseId, body),
    onSettled: () => refreshLearnerData(client),
  });
}

/**
 * Claiming a certificate. `onClaimed` belongs to the mutation, not to the form: it runs as soon as
 * the server creates the certificate, even if the form is gone by then (the course shows the
 * certificate as soon as its content is read again). The learner's data are read again afterwards;
 * the claim stays pending until they are, so it cannot be sent twice.
 */
export function claimCertificateOptions(
  client: QueryClient,
  claim: (body: CertificateRequest) => Promise<Certificate>,
  onClaimed: (certificate: Certificate) => void,
): UseMutationOptions<Certificate, Error, CertificateRequest> {
  return {
    mutationFn: claim,
    onSuccess: (certificate) => {
      onClaimed(certificate);
    },
    onSettled: () => refreshLearnerData(client),
  };
}

export function useClaimCertificate(
  courseId: string,
  onClaimed: (certificate: Certificate) => void,
) {
  const client = useQueryClient();
  return useMutation(
    claimCertificateOptions(client, (body) => api.claimCertificate(courseId, body), onClaimed),
  );
}

export function useCertificate(id: string) {
  return useQuery({
    queryKey: ['certificate', id],
    queryFn: ({ signal }) => api.certificate(id, signal),
    retry: false,
    ...STATIC,
  });
}
