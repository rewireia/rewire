import {
  captureResultSchema,
  startedTopUpSchema,
  topUpResultSchema,
  walletMovementsSchema,
  type CaptureResult,
  type Region,
  type StartedTopUp,
  type TopUpResult,
  type WalletMovements,
  type WalletPaymentRequest,
} from '@rewire/contracts';

import { segment, sendJson, type Request } from './request.ts';

/** The learner's wallet: money added with PayPal, courses paid from it, and its movements. */
export function walletApi(request: Request) {
  return {
    walletMovements(region: Region, signal?: AbortSignal): Promise<WalletMovements> {
      return request(
        `/wallet/movements?${new URLSearchParams({ region })}`,
        walletMovementsSchema,
        { signal: signal ?? null },
      );
    },
    openTopUp(region: Region, amountMinor: number): Promise<StartedTopUp> {
      return request(
        '/wallet/top-ups',
        startedTopUpSchema,
        sendJson('POST', { region, amountMinor }),
      );
    },
    captureTopUp(topUpId: string): Promise<TopUpResult> {
      return request(
        `/wallet/top-ups/${segment(topUpId)}/capture`,
        topUpResultSchema,
        sendJson('POST'),
      );
    },
    payFromWallet(body: WalletPaymentRequest): Promise<CaptureResult> {
      return request('/wallet/payments', captureResultSchema, sendJson('POST', body));
    },
  };
}
