import { findDemoCourse, findSellableCourse, type DemoCourse } from '@rewire/content';
import type {
  Certificate,
  CertificateRequest,
  CourseContent,
  Enrolment as EnrolmentLine,
  EnrolmentList,
  ListedEnrolment,
  QuizResult,
  QuizSubmission,
} from '@rewire/contracts';
import type { Engine } from '@rewire/engine';

import { HttpProblem, invalidInput, notFound } from '../../http/problem.ts';
import { mostExposed, tasksTheyDo } from '../exposure/task-focus.ts';
import type { LearnerStore } from '../learners/learner-store.ts';

import { normaliseCertificateId } from './certificate-id.ts';
import { addressOf, listedEnrolment } from './listed-enrolment.ts';
import type { Enrolment, EnrolmentStore, IssuedCertificate } from './enrolment-store.ts';

/** Ids drawn before giving up; with 31⁸ ids, even a second draw is a rare event. */
const CERTIFICATE_ID_ATTEMPTS = 5;

export interface LearningDependencies {
  readonly enrolments: EnrolmentStore;
  readonly learners: LearnerStore;
  readonly engine: Engine;
  readonly newCertificateId: () => string;
  /** Where a course the seller published is taken: given only to a learner enrolled in it. */
  readonly accessUrlOf: (courseId: string) => string | undefined;
}

/** A course the learner can study: paid for, and neither refunded nor revoked. */
interface OpenCourse {
  readonly course: DemoCourse;
  readonly enrolment: Enrolment & { readonly status: 'active' | 'completed' };
}

/**
 * Studying a paid course: lessons, the quiz the server marks, and a certificate anyone can
 * verify. Only an enrolment that is active or completed opens a course.
 */
export interface LearningService {
  listEnrolments(learnerId: string): Promise<EnrolmentList>;
  courseContent(learnerId: string, courseId: string): Promise<CourseContent>;
  completeLesson(learnerId: string, courseId: string, lessonId: string): Promise<void>;
  submitQuiz(learnerId: string, courseId: string, submission: QuizSubmission): Promise<QuizResult>;
  /** The certificate of a completed course; `created` is false when it already existed. */
  issueCertificate(
    learnerId: string,
    courseId: string,
    request: CertificateRequest,
  ): Promise<{ certificate: Certificate; created: boolean }>;
  /** A certificate by its id, for anyone to check. */
  verifyCertificate(id: string): Promise<Certificate>;
  /** A listed course the learner bought: it is taken at its provider, not in Rewire. */
  listedEnrolment(learnerId: string, courseId: string): Promise<ListedEnrolment>;
}

export function createLearningService(dependencies: LearningDependencies): LearningService {
  const { enrolments } = dependencies;
  const openCourse = async (learnerId: string, courseId: string): Promise<OpenCourse> => {
    const course = findDemoCourse(courseId);
    const enrolment = await enrolments.find(learnerId, courseId);
    if (course === undefined || enrolment === undefined || enrolment.status === 'revoked') {
      throw notFound('A course you are enrolled in with that id');
    }
    return { course, enrolment: { ...enrolment, status: enrolment.status } };
  };

  return {
    listEnrolments: (learnerId) => listEnrolments(dependencies, learnerId),
    courseContent: async (learnerId, courseId) =>
      contentOf(dependencies, learnerId, await openCourse(learnerId, courseId)),
    async completeLesson(learnerId, courseId, lessonId) {
      const { course, enrolment } = await openCourse(learnerId, courseId);
      if (!course.lessons.some((lesson) => lesson.id === lessonId)) {
        throw notFound('That lesson');
      }
      await enrolments.completeLesson(enrolment.id, lessonId);
    },
    submitQuiz: async (learnerId, courseId, submission) =>
      markQuiz(enrolments, await openCourse(learnerId, courseId), submission),
    issueCertificate: async (learnerId, courseId, request) =>
      issueCertificate(dependencies, learnerId, await openCourse(learnerId, courseId), request),
    async verifyCertificate(id) {
      const certificate = await enrolments.findCertificate(normaliseCertificateId(id));
      if (certificate === undefined) {
        throw notFound('A certificate with that id');
      }
      return presentCertificate(certificate);
    },
    listedEnrolment: (learnerId, courseId) => listedEnrolment(dependencies, learnerId, courseId),
  };
}

async function listEnrolments(
  dependencies: LearningDependencies,
  learnerId: string,
): Promise<EnrolmentList> {
  const all = await dependencies.enrolments.listByLearner(learnerId);
  const lines = all.flatMap((enrolment) => {
    if (enrolment.status === 'revoked') return [];
    const open = { ...enrolment, status: enrolment.status };
    const hosted = findDemoCourse(enrolment.courseId);
    if (hosted !== undefined) return [lineOf(hosted, open)];
    const listed = findSellableCourse(enrolment.courseId);
    const url = listed && addressOf(dependencies, listed);
    return listed?.kind === 'listed' && url !== undefined
      ? [listedLineOf({ ...listed, url }, open)]
      : [];
  });
  return { enrolments: lines };
}

/** What every line says of the enrolment itself. */
function standingOf(enrolment: OpenCourse['enrolment']) {
  return {
    status: enrolment.status,
    quizPassed: enrolment.quizPassedAt !== undefined,
    startedAt: enrolment.startedAt,
    completedAt: enrolment.completedAt ?? null,
    certificateId: enrolment.certificateId ?? null,
  };
}

function lineOf(course: DemoCourse, enrolment: OpenCourse['enrolment']): EnrolmentLine {
  return {
    kind: 'hosted',
    courseId: course.id,
    title: course.title,
    stage: course.stage,
    lessonsCompleted: lessonsDone(course, enrolment).length,
    lessons: course.lessons.length,
    provider: null,
    url: null,
    ...standingOf(enrolment),
  };
}

/** A listed course is taken at its provider: no stage, lessons, quiz or certificate here. */
function listedLineOf(
  course: { id: string; title: string; provider: string; url: string },
  enrolment: OpenCourse['enrolment'],
): EnrolmentLine {
  return {
    kind: 'listed',
    courseId: course.id,
    title: course.title,
    stage: null,
    lessonsCompleted: null,
    lessons: null,
    provider: course.provider,
    url: course.url,
    ...standingOf(enrolment),
  };
}

/** The lessons of the course marked as done; lessons no longer in the course do not count. */
function lessonsDone(course: DemoCourse, enrolment: Enrolment): DemoCourse['lessons'] {
  return course.lessons.filter((lesson) => enrolment.completedLessons.has(lesson.id));
}

async function contentOf(
  { learners, engine }: LearningDependencies,
  learnerId: string,
  { course, enrolment }: OpenCourse,
): Promise<CourseContent> {
  const profile = (await learners.find(learnerId))?.profile;
  const exposure =
    profile === undefined ? undefined : engine.exposureProfile(profile.occupation.isco08);
  return {
    id: course.id,
    title: course.title,
    summary: course.summary,
    stage: course.stage,
    hours: course.hours,
    status: enrolment.status,
    lessons: course.lessons.map((lesson) => ({
      ...lesson,
      blocks: [...lesson.blocks],
      completed: enrolment.completedLessons.has(lesson.id),
    })),
    practice: {
      ...course.practice,
      // Real tasks of the learner's own job; none until they confirm an occupation.
      tasks: exposure === undefined ? [] : mostExposed(tasksTheyDo(exposure, profile)),
    },
    quiz: {
      passMark: course.quiz.passMark,
      // The answers and explanations stay on the server until the quiz is marked.
      questions: course.quiz.questions.map(({ id, prompt, options }) => ({
        id,
        prompt,
        options: [...options],
      })),
      passed: enrolment.quizPassedAt !== undefined,
    },
    certificateId: enrolment.certificateId ?? null,
  };
}

/**
 * Marks a quiz on the server. A pass completes the course; a later failed attempt does
 * not undo it.
 */
async function markQuiz(
  enrolments: EnrolmentStore,
  { course, enrolment }: OpenCourse,
  { answers }: QuizSubmission,
): Promise<QuizResult> {
  const { questions, passMark } = course.quiz;
  checkAnswers(questions, answers);
  if (lessonsDone(course, enrolment).length < course.lessons.length) {
    throw new HttpProblem({
      status: 409,
      code: 'lessons_incomplete',
      title: 'Lessons not finished',
      detail: 'Finish every lesson of the course before taking its quiz.',
    });
  }
  const marked = questions.map((question, position) => ({
    id: question.id,
    correct: answers[position] === question.correctOption,
    correctOption: question.correctOption,
    explanation: question.explanation,
  }));
  const correct = marked.filter((question) => question.correct).length;
  const passed = correct >= passMark;
  if (passed) {
    await enrolments.recordQuizPassed(enrolment.id);
  }
  return { passed, correct, passMark, questions: marked };
}

/** One answer per question, each naming one of its options. */
function checkAnswers(
  questions: DemoCourse['quiz']['questions'],
  answers: readonly number[],
): void {
  if (answers.length !== questions.length) {
    throw invalidInput([
      { path: 'answers', message: `Expected ${questions.length} answers, one per question.` },
    ]);
  }
  const outOfRange = questions.flatMap((question, position) => {
    const answer = answers[position] ?? 0;
    return answer < question.options.length
      ? []
      : [{ path: `answers.${position}`, message: 'This question has no such option.' }];
  });
  if (outOfRange.length > 0) {
    throw invalidInput(outOfRange);
  }
}

async function issueCertificate(
  { enrolments, learners, newCertificateId }: LearningDependencies,
  learnerId: string,
  { course, enrolment }: OpenCourse,
  { learnerName }: CertificateRequest,
): Promise<{ certificate: Certificate; created: boolean }> {
  if (enrolment.status !== 'completed') {
    throw new HttpProblem({
      status: 409,
      code: 'course_not_completed',
      title: 'Course not completed',
      detail: 'Pass the quiz of the course to earn its certificate.',
    });
  }
  if (enrolment.certificateId !== undefined) {
    const existing = await enrolments.findCertificate(enrolment.certificateId);
    if (existing !== undefined) {
      return { certificate: presentCertificate(existing), created: false };
    }
  }
  for (let attempt = 0; attempt < CERTIFICATE_ID_ATTEMPTS; attempt += 1) {
    const id = newCertificateId();
    const issued = await enrolments.issueCertificate({
      id,
      enrolmentId: enrolment.id,
      learnerName,
      courseId: course.id,
      courseTitle: course.title,
      hours: course.hours,
    });
    // Another request may have issued it first: that certificate is the one.
    if (issued !== undefined) {
      if (issued.id === id) {
        await learners.saveCertificateName(learnerId, learnerName);
      }
      return { certificate: presentCertificate(issued), created: issued.id === id };
    }
  }
  // Practically unreachable with random ids; if it happens, the learner can simply try again.
  throw new HttpProblem({
    status: 503,
    code: 'certificate_unavailable',
    title: 'Certificate not issued',
    detail:
      'No certificate id was free this time. Your course stays completed: try again in a moment.',
  });
}

function presentCertificate(certificate: IssuedCertificate): Certificate {
  return {
    id: certificate.id,
    learnerName: certificate.learnerName,
    courseTitle: certificate.courseTitle,
    hours: certificate.hours,
    issuedOn: certificate.issuedOn,
    demo: true,
  };
}
