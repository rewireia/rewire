import { regionSchema, topUpRequestSchema, walletPaymentRequestSchema } from '@rewire/contracts';
import { Hono } from 'hono';

import type { HttpEnvironment } from '../../http/environment.ts';
import { parseBody, parseInput } from '../../http/validate.ts';
import { requireDashboardAccess } from '../learners/dashboard-access.ts';

import type { WalletService } from './wallet-service.ts';

/** The learner's wallet: top-ups with PayPal, payments from the balance and movements. */
export function walletRoutes(wallet: WalletService): Hono<HttpEnvironment> {
  return new Hono<HttpEnvironment>()
    .get('/wallet/movements', async (context) =>
      context.json(
        await wallet.movements(
          requireDashboardAccess(context),
          parseInput(regionSchema, context.req.query('region')),
        ),
      ),
    )
    .post('/wallet/top-ups', async (context) => {
      const learnerId = requireDashboardAccess(context);
      const request = await parseBody(context, topUpRequestSchema);
      return context.json(await wallet.openTopUp(learnerId, request), 201);
    })
    .post('/wallet/top-ups/:topUpId/capture', async (context) =>
      context.json(
        await wallet.captureTopUp(requireDashboardAccess(context), context.req.param('topUpId')),
      ),
    )
    .post('/wallet/top-ups/:topUpId/refresh', async (context) =>
      context.json(
        await wallet.refreshTopUp(requireDashboardAccess(context), context.req.param('topUpId')),
      ),
    )
    .post('/wallet/payments', async (context) => {
      const learnerId = requireDashboardAccess(context);
      const request = await parseBody(context, walletPaymentRequestSchema);
      return context.json(await wallet.pay(learnerId, request), 201);
    });
}
