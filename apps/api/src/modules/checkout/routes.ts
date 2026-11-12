import { startOrderRequestSchema } from '@rewire/contracts';
import { Hono } from 'hono';

import type { HttpEnvironment } from '../../http/environment.ts';
import { parseBody, regionOf } from '../../http/validate.ts';
import { requireDashboardAccess } from '../learners/dashboard-access.ts';
import { requireLearner } from '../learners/current-learner.ts';
import type { Sessions } from '../learners/session.ts';

import type { CheckoutService } from './checkout-service.ts';

export interface CheckoutRouteDependencies {
  readonly checkout: CheckoutService;
  readonly sessions: Sessions;
}

/** Buying a course, and the learner's payments. */
export function checkoutRoutes({
  checkout,
  sessions,
}: CheckoutRouteDependencies): Hono<HttpEnvironment> {
  return new Hono<HttpEnvironment>()
    .get('/regions/:region/payment-config', (context) => {
      const region = regionOf(context);
      return context.json(checkout.paymentConfig(region));
    })
    .post('/checkout/orders', async (context) => {
      const request = await parseBody(context, startOrderRequestSchema);
      const learnerId =
        request.courseIds === undefined
          ? await sessions.ensureLearner(context)
          : requireDashboardAccess(context);
      return context.json(await checkout.startOrder(learnerId, request), 201);
    })
    .post('/checkout/orders/:orderId/capture', async (context) =>
      context.json(
        await checkout.captureOrder(requireLearner(context), context.req.param('orderId')),
      ),
    )
    .get('/payments', async (context) => {
      const learnerId = requireDashboardAccess(context);
      return context.json(await checkout.listPayments(learnerId));
    })
    .post('/payments/:orderId/refresh', async (context) => {
      const order = await checkout.orderOf(requireLearner(context), context.req.param('orderId'));
      return context.json(await checkout.reconcile(order, 'reconciliation'));
    })
    .post('/payments/:orderId/refund', async (context) =>
      context.json(await checkout.refund(requireLearner(context), context.req.param('orderId'))),
    );
}
