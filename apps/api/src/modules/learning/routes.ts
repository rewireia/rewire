import { certificateRequestSchema, quizSubmissionSchema } from '@rewire/contracts';
import { Hono } from 'hono';

import type { HttpEnvironment } from '../../http/environment.ts';
import { parseBody } from '../../http/validate.ts';
import { requireDashboardAccess } from '../learners/dashboard-access.ts';
import { requireLearner } from '../learners/current-learner.ts';

import type { LearningService } from './learning-service.ts';

/** The learner's courses, and the public check of a certificate. */
export function learningRoutes(learning: LearningService): Hono<HttpEnvironment> {
  return new Hono<HttpEnvironment>()
    .get('/learning', async (context) => {
      const learnerId = requireDashboardAccess(context);
      return context.json(await learning.listEnrolments(learnerId));
    })
    .get('/learning/listed-courses/:courseId', async (context) =>
      context.json(
        await learning.listedEnrolment(requireLearner(context), context.req.param('courseId')),
      ),
    )
    .get('/learning/courses/:courseId', async (context) =>
      context.json(
        await learning.courseContent(requireLearner(context), context.req.param('courseId')),
      ),
    )
    .post('/learning/courses/:courseId/lessons/:lessonId/complete', async (context) => {
      const { courseId, lessonId } = context.req.param();
      await learning.completeLesson(requireLearner(context), courseId, lessonId);
      return context.body(null, 204);
    })
    .post('/learning/courses/:courseId/quiz', async (context) => {
      const learnerId = requireLearner(context);
      const submission = await parseBody(context, quizSubmissionSchema);
      return context.json(
        await learning.submitQuiz(learnerId, context.req.param('courseId'), submission),
      );
    })
    .post('/learning/courses/:courseId/certificate', async (context) => {
      const learnerId = requireLearner(context);
      const request = await parseBody(context, certificateRequestSchema);
      const { certificate, created } = await learning.issueCertificate(
        learnerId,
        context.req.param('courseId'),
        request,
      );
      return context.json(certificate, created ? 201 : 200);
    })
    .get('/certificates/:id', async (context) => {
      // Public on purpose: whoever holds a certificate id can check it, with no session.
      const certificate = await learning.verifyCertificate(context.req.param('id'));
      return context.json(certificate);
    });
}
