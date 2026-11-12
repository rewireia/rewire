import type { Region } from '@rewire/contracts';

import { HttpProblem } from '../../http/problem.ts';

import { PaymentGatewayError, type PaymentGateway } from './gateway.ts';

/** The gateway of a region, or a 503 that says plainly nothing can be bought there. */
export function gatewayFinder(
  gateways: Readonly<Partial<Record<Region, PaymentGateway>>>,
): (region: Region) => PaymentGateway {
  return (region) => {
    const gateway = gateways[region];
    if (gateway === undefined) {
      throw new HttpProblem({
        status: 503,
        code: 'payments_unavailable',
        title: 'Payments are not set up',
        detail: 'This server has no PayPal credentials for the region, so nothing can be bought.',
      });
    }
    return gateway;
  };
}

/** Runs a call to the gateway, turning PayPal's refusals into problem answers. */
export async function withGateway<Result>(call: () => Promise<Result>): Promise<Result> {
  try {
    return await call();
  } catch (error) {
    throw asProblem(error);
  }
}

/** A refusal of PayPal becomes a 502 that names PayPal's own code, to look it up. */
export function asProblem(error: unknown): unknown {
  if (!(error instanceof PaymentGatewayError)) {
    return error;
  }
  const debugId = error.debugId === undefined ? '' : ` (debug id ${error.debugId})`;
  return new HttpProblem({
    status: 502,
    code: 'payment_provider_error',
    title: 'PayPal could not complete the request',
    detail: `PayPal answered ${error.issue}${debugId}. Nothing was charged by this step.`,
  });
}
