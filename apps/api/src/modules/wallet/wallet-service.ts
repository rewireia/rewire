import type {
  CaptureResult,
  Region,
  StartedTopUp,
  TopUpRequest,
  TopUpResult,
  Wallet,
  WalletMovements,
  WalletPaymentRequest,
} from '@rewire/contracts';

import type { PaymentsConfig } from '../../config.ts';
import { HttpProblem } from '../../http/problem.ts';
import type { Logger } from '../../logger.ts';
import type { Clock } from '../../platform/clock.ts';
import type { Database } from '../../platform/database.ts';
import type { PaymentGateway } from '../checkout/gateway.ts';
import { gatewayFinder } from '../checkout/gateway-problems.ts';
import type { OrderStore } from '../checkout/order-store.ts';
import type { SettleAttempt } from '../checkout/purchase-guards.ts';
import type { PaymentReference } from '../checkout/webhook-routes.ts';
import type { Marketplace } from '../marketplace/service.ts';

import { walletMovements } from './movements.ts';
import { payFromWallet } from './payments.ts';
import { createTopUpStore } from './top-up-store.ts';
import {
  captureTopUp,
  openTopUp,
  refreshTopUp,
  refreshUnsettled,
  settleTopUpEvent,
} from './top-ups.ts';

interface WalletDependencies {
  readonly database: Database;
  readonly clock: Clock;
  readonly logger: Logger;
  readonly payments: PaymentsConfig;
  readonly gateways: Readonly<Partial<Record<Region, PaymentGateway>>>;
  readonly marketplace: Marketplace;
  readonly orders: OrderStore;
  /** Settles an attempt to pay, by PayPal or by invoice, that holds a course unanswered. */
  readonly settleAttempt: SettleAttempt;
}

/**
 * The learner's wallet: money added with PayPal, courses paid from it, and its movements. Every
 * figure is read from the top-ups PayPal captured and the orders paid from it.
 */
export interface WalletService {
  /** The balance, once the top-ups PayPal still held have been read again. */
  standing(learnerId: string, region: Region): Promise<Wallet>;
  movements(learnerId: string, region: Region): Promise<WalletMovements>;
  openTopUp(learnerId: string, request: TopUpRequest): Promise<StartedTopUp>;
  captureTopUp(learnerId: string, topUpId: string): Promise<TopUpResult>;
  refreshTopUp(learnerId: string, topUpId: string): Promise<TopUpResult>;
  pay(learnerId: string, request: WalletPaymentRequest): Promise<CaptureResult>;
  /** Settles the top-up a PayPal webhook is about; returns whether it was one. */
  settleTopUpEvent(reference: PaymentReference): Promise<boolean>;
}

export function createWalletService(dependencies: WalletDependencies): WalletService {
  const { database, clock, logger, marketplace, orders } = dependencies;
  const topUps = createTopUpStore(database, clock);
  const assertSandbox = () => {
    if (dependencies.payments.environment !== 'sandbox') {
      throw new HttpProblem({
        status: 409,
        code: 'sandbox_required',
        title: 'The wallet works with PayPal sandbox only',
      });
    }
  };
  const topUpParts = {
    topUps,
    gatewayOf: gatewayFinder(dependencies.gateways),
    assertSandbox,
    logger,
  };
  const paymentParts = {
    database,
    marketplace,
    clock,
    orders,
    settleAttempt: dependencies.settleAttempt,
    assertSandbox,
  };
  return {
    async standing(learnerId, region) {
      await refreshUnsettled(topUpParts, learnerId, region);
      return marketplace.wallet(learnerId, region);
    },
    async movements(learnerId, region) {
      await refreshUnsettled(topUpParts, learnerId, region);
      return walletMovements({ topUps, orders }, learnerId, region);
    },
    openTopUp: (learnerId, request) => openTopUp(topUpParts, learnerId, request),
    captureTopUp: (learnerId, id) => captureTopUp(topUpParts, learnerId, id),
    refreshTopUp: (learnerId, id) => refreshTopUp(topUpParts, learnerId, id),
    pay: (learnerId, request) => payFromWallet(paymentParts, learnerId, request),
    settleTopUpEvent: (reference) => settleTopUpEvent(topUpParts, reference),
  };
}
