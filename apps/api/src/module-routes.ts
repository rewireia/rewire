import { LIBRARY_READINGS } from '@rewire/content';
import { loadTaskRationales, type TaskRationales } from '@rewire/data';
import type { Hono } from 'hono';

import type { Parts } from './container.ts';
import type { HttpEnvironment } from './http/environment.ts';
import { analystRoutes } from './modules/analyst/routes.ts';
import { checkoutRoutes } from './modules/checkout/routes.ts';
import { webhookRoutes } from './modules/checkout/webhook-routes.ts';
import { createCertificateLoader } from './modules/checkout/webhook-signature.ts';
import { courseRoutes } from './modules/courses/routes.ts';
import { exposureRoutes } from './modules/exposure/routes.ts';
import { guideRoutes } from './modules/guide/routes.ts';
import { createTokenBudget } from './modules/guide/token-budget.ts';
import { healthRoutes } from './modules/health/routes.ts';
import { insightRoutes } from './modules/insights/routes.ts';
import { createInsightsService } from './modules/insights/service.ts';
import { learnerRoutes } from './modules/learners/routes.ts';
import { learningRoutes } from './modules/learning/routes.ts';
import { libraryRoutes } from './modules/library/routes.ts';
import { marketplaceRoutes } from './modules/marketplace/routes.ts';
import { occupationRoutes } from './modules/occupations/routes.ts';
import { offerRoutes } from './modules/offers/routes.ts';
import { pathwayRoutes } from './modules/pathway/routes.ts';
import { regionRoutes } from './modules/regions/routes.ts';
import { sellerCourseRoutes } from './modules/seller-courses/routes.ts';
import { sourceRoutes } from './modules/sources/routes.ts';
import { sponsorshipRoutes } from './modules/sponsorship/routes.ts';
import { studyPlanRoutes } from './modules/study-plan/routes.ts';
import { walletRoutes } from './modules/wallet/routes.ts';
import { limitsOf, studioModelOf, webhookIdsOf } from './service-providers.ts';

/** The routes of every module, in the order they are mounted under `/api`. */
export function moduleRoutes(parts: Parts): Hono<HttpEnvironment>[] {
  const { config, logger, overrides, clock, bundle, database, engine } = parts;
  const { learners, orders, sessions, checkout, pathways, learning, studyPlans } = parts;
  const { sponsorship, guide } = parts;
  let rationales: Promise<TaskRationales> | undefined;
  return [
    healthRoutes(),
    regionRoutes(bundle),
    insightRoutes(createInsightsService(bundle)),
    occupationRoutes(engine, bundle.manifest),
    // Read on first use and kept: the file is large and most requests never need it.
    exposureRoutes({
      engine,
      translateTasks: parts.translateTasks,
      loadTaskRationales: () => (rationales ??= loadTaskRationales()),
    }),
    sourceRoutes(bundle.manifest),
    libraryRoutes(LIBRARY_READINGS),
    learnerRoutes({ engine, learners, sessions }),
    // Before the plan's routes: the catalogue answers the list of a region's courses.
    courseRoutes(parts.courses),
    pathwayRoutes(pathways),
    studyPlanRoutes({ studyPlans, sessions }),
    checkoutRoutes({ checkout, sessions }),
    marketplaceRoutes(parts.marketplace, parts.wallet, parts.sellerCourses),
    sellerCourseRoutes(parts.sellerCourses),
    offerRoutes(parts.beacons, parts.marketplace),
    walletRoutes(parts.wallet),
    sponsorshipRoutes({ sponsorship, sessions }),
    learningRoutes(learning),
    guideRoutes({
      engine,
      guide,
      sessions,
      disclosure: {
        provider: config.guide.model === undefined ? null : 'openai',
        usedToImproveModels: config.guide.providerTrainsOnData,
      },
    }),
    analystRoutes({
      model:
        overrides.studioModel === undefined
          ? studioModelOf(config.guide)
          : (overrides.studioModel ?? undefined),
      // Its own, so that a question that takes the analyst dozens of turns leaves the guide's.
      budget: createTokenBudget(limitsOf(config.guide.analystDailyTokenBudget, 'analyst'), clock),
    }),
    webhookRoutes({
      checkout,
      orders,
      database,
      webhookIds: webhookIdsOf(config),
      loadCertificate: overrides.loadCertificate ?? createCertificateLoader(),
      onInvoiceEvent: (invoiceId, reference) => sponsorship.reconcileInvoice(invoiceId, reference),
      onTopUpEvent: (reference) => parts.wallet.settleTopUpEvent(reference),
      clock,
      logger,
    }),
  ];
}
