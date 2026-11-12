import {
  certificateSchema,
  courseContentSchema,
  enrolmentListSchema,
  listedEnrolmentSchema,
  quizResultSchema,
  type Certificate,
  type CertificateRequest,
  type CourseContent,
  type EnrolmentList,
  type ListedEnrolment,
  type QuizResult,
  type QuizSubmission,
} from '@rewire/contracts';

import { NO_CONTENT, segment, sendJson, type Request } from './request.ts';

/** Studying a course, its quiz and its certificate. */
export function learningApi(request: Request) {
  const coursePath = (courseId: string) => `/learning/courses/${segment(courseId)}`;
  return {
    enrolments(signal?: AbortSignal): Promise<EnrolmentList> {
      return request('/learning', enrolmentListSchema, { signal: signal ?? null });
    },
    /** A listed course the learner bought: it is taken at its provider. */
    listedEnrolment(courseId: string, signal?: AbortSignal): Promise<ListedEnrolment> {
      const path = `/learning/listed-courses/${segment(courseId)}`;
      return request(path, listedEnrolmentSchema, { signal: signal ?? null });
    },
    courseContent(courseId: string, signal?: AbortSignal): Promise<CourseContent> {
      return request(coursePath(courseId), courseContentSchema, { signal: signal ?? null });
    },
    completeLesson(courseId: string, lessonId: string): Promise<null> {
      const path = `${coursePath(courseId)}/lessons/${segment(lessonId)}/complete`;
      return request(path, NO_CONTENT, sendJson('POST'));
    },
    submitQuiz(courseId: string, body: QuizSubmission): Promise<QuizResult> {
      return request(`${coursePath(courseId)}/quiz`, quizResultSchema, sendJson('POST', body));
    },
    claimCertificate(courseId: string, body: CertificateRequest): Promise<Certificate> {
      const path = `${coursePath(courseId)}/certificate`;
      return request(path, certificateSchema, sendJson('POST', body));
    },
    certificate(id: string, signal?: AbortSignal): Promise<Certificate> {
      return request(`/certificates/${segment(id)}`, certificateSchema, { signal: signal ?? null });
    },
  };
}
