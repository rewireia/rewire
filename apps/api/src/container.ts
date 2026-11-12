import type { Region } from '@rewire/contracts';
import { loadDataBundle, type DataBundle } from '@rewire/data';
import { createEngine, type Engine } from '@rewire/engine';
import type { Hono } from 'hono';

import { createApp } from './app.ts';
import { moduleRoutes } from './module-routes.ts';
import {
  gatewaysOf,
  invoicingOf,
  limitsOf,
  modelOf,
  translationModelOf,
} from './service-providers.ts';
import type { Config } from './config.ts';
import type { HttpEnvironment } from './http/environment.ts';
import type { Logger } from './logger.ts';
import {
  createCheckoutService,
  type CheckoutService,
} from './modules/checkout/checkout-service.ts';
import type { PaymentGateway } from './modules/checkout/gateway.ts';
import { createOrderStore, type OrderStore } from './modules/checkout/order-store.ts';
import type { CertificateLoader } from './modules/checkout/webhook-signature.ts';
import type { StudioModel } from './modules/analyst/studio-model.ts';
import {
  createTaskTranslations,
  type TaskTranslationModel,
} from './modules/exposure/translation.ts';
import {
  createCourseCatalogue,
  type CourseCatalogueService,
} from './modules/courses/catalogue-service.ts';
import { createGuideService, type GuideService } from './modules/guide/guide-service.ts';
import type { GuideModel } from './modules/guide/model.ts';
import { createTokenBudget, meteredBy } from './modules/guide/token-budget.ts';
import { createLearnerStore, type LearnerStore } from './modules/learners/learner-store.ts';
import { createSessions, type Sessions } from './modules/learners/session.ts';
import { newCertificateId } from './modules/learning/certificate-id.ts';
import { createEnrolmentStore, type EnrolmentStore } from './modules/learning/enrolment-store.ts';
import {
  createLearningService,
  type LearningService,
} from './modules/learning/learning-service.ts';
import { createMarketplace, type Marketplace } from './modules/marketplace/service.ts';
import { createBeacons, type Beacons } from './modules/offers/beacons.ts';
import {
  createSellerCourses,
  type SellerCourses,
} from './modules/seller-courses/seller-courses.ts';
import { createPathwayService, type PathwayService } from './modules/pathway/pathway-service.ts';
import type { InvoicingGateway } from './modules/sponsorship/invoicing.ts';
import {
  createSponsorshipService,
  type SponsorshipService,
} from './modules/sponsorship/sponsorship-service.ts';
import {
  createSponsorshipStore,
  type SponsorshipStore,
} from './modules/sponsorship/sponsorship-store.ts';
import {
  createStudyPlanService,
  type StudyPlanService,
} from './modules/study-plan/study-plan-service.ts';
import { createStudyPlanStore } from './modules/study-plan/study-plan-store.ts';
import { createWalletService, type WalletService } from './modules/wallet/wallet-service.ts';
import { systemClock, type Clock } from './platform/clock.ts';
import { migrate, openDatabase, type Database } from './platform/database.ts';
import { resolveSessionSecret } from './platform/session-secret.ts';

/**
 * What a test replaces: everything that would reach outside the process, and what it must
 * be able to repeat, such as the time and the ids drawn at random.
 */
export interface Overrides {
  readonly bundle?: DataBundle;
  readonly clock?: Clock;
  readonly gateways?: Readonly<Partial<Record<Region, PaymentGateway>>>;
  readonly invoicing?: Readonly<Partial<Record<Region, InvoicingGateway>>>;
  /** The language model of the guide. `null` runs the server without one. */
  readonly model?: GuideModel | null;
  readonly taskTranslationModel?: TaskTranslationModel | null;
  /** The model behind the analyst of "Analyse". `null` runs the server without one. */
  readonly studioModel?: StudioModel | null;
  readonly loadCertificate?: CertificateLoader;
  readonly newCertificateId?: () => string;
}

export interface Container {
  readonly app: Hono<HttpEnvironment>;
  close(): void;
}

/** What the services stand on: the settings, the data, the database and its stores. */
interface Foundations {
  readonly config: Config;
  readonly logger: Logger;
  readonly overrides: Overrides;
  readonly clock: Clock;
  readonly bundle: DataBundle;
  readonly database: Database;
  readonly engine: Engine;
  readonly learners: LearnerStore;
  readonly orders: OrderStore;
  readonly enrolments: EnrolmentStore;
  readonly sponsorships: SponsorshipStore;
  readonly sessions: Sessions;
  readonly sellerCourses: SellerCourses;
}

/** The rules of each feature, shared by the modules that need them. */
interface Services {
  readonly marketplace: Marketplace;
  readonly courses: CourseCatalogueService;
  readonly wallet: WalletService;
  readonly checkout: CheckoutService;
  readonly pathways: PathwayService;
  readonly learning: LearningService;
  readonly studyPlans: StudyPlanService;
  readonly sponsorship: SponsorshipService;
  readonly guide: GuideService;
  readonly translateTasks: ReturnType<typeof createTaskTranslations>;
  readonly beacons: Beacons;
}

/** Everything the modules are built from, created once per container. */
export type Parts = Foundations & Services;

/**
 * The composition root: the one place that knows how the parts fit together. Everything
 * else receives what it needs and creates nothing.
 */
export async function createContainer(
  config: Config,
  logger: Logger,
  overrides: Overrides = {},
): Promise<Container> {
  const parts = await createParts(config, logger, overrides);
  const app = createApp({
    logger,
    publicOrigin: config.publicOrigin,
    webRoot: config.webRoot,
    session: parts.sessions.middleware,
    modules: moduleRoutes(parts),
  });
  return {
    app,
    close: () => {
      parts.database.close();
    },
  };
}

/** The data, the stores and the services, each created once. */
async function createParts(config: Config, logger: Logger, overrides: Overrides): Promise<Parts> {
  const foundations = await createFoundations(config, logger, overrides);
  return { ...foundations, ...createServices(foundations) };
}

async function createFoundations(
  config: Config,
  logger: Logger,
  overrides: Overrides,
): Promise<Foundations> {
  const clock = overrides.clock ?? systemClock;
  const bundle = overrides.bundle ?? (await loadDataBundle());
  const database = await openMigratedDatabase(config.databaseUrl, logger, clock);
  const learners = createLearnerStore(database, clock);
  // The seller's own courses join the catalogue before any request is answered.
  const sellerCourses = createSellerCourses(database, clock);
  await sellerCourses.load();
  const sessions = createSessions(learners, {
    secret: await resolveSessionSecret(config.sessionSecret),
    secure: config.environment === 'production',
  });
  return {
    config,
    logger,
    overrides,
    clock,
    bundle,
    database,
    engine: createEngine(bundle),
    learners,
    orders: createOrderStore(database, clock),
    enrolments: createEnrolmentStore(database, clock),
    sponsorships: createSponsorshipStore(database, clock),
    sessions,
    sellerCourses,
  };
}

function createServices(foundations: Foundations): Services {
  const { config, logger, overrides, clock, database, engine } = foundations;
  const { learners, orders, enrolments, sponsorships } = foundations;
  const model =
    overrides.model === undefined ? modelOf(config.guide) : (overrides.model ?? undefined);
  const budget = createTokenBudget(limitsOf(config.guide.dailyTokenBudget, 'guide'), clock);
  const metered = model && meteredBy(budget, model);
  const marketplace = createMarketplace(database, clock, engine, metered);
  const courses = createCourseCatalogue({ marketplace, enrolments, orders, model: metered });
  const checkout = createCheckoutService({
    marketplace,
    payments: config.payments,
    gateways: overrides.gateways ?? gatewaysOf(config),
    orders,
    enrolments,
    // Each module settles the attempts to pay it made; they are passed in, so neither module
    // depends on the other.
    settleInvoiceAttempt: (attempt) => sponsorship.settleAttempt(attempt),
    clock,
    logger,
  });
  const pathways = createPathwayService({ engine, learners, enrolments, orders, marketplace });
  const learning = createLearning(foundations);
  const studyPlans = createStudyPlanService({
    pathways,
    learning,
    orders,
    plans: createStudyPlanStore(database, clock),
    clock,
  });
  const sponsorship = createSponsorshipService({
    marketplace,
    invoicing: overrides.invoicing ?? invoicingOf(config, clock),
    orders,
    sponsorships,
    settlePaymentAttempt: (attempt) => checkout.settleAttempt(attempt),
    clock,
  });
  const wallet = createWallet(foundations, { marketplace, checkout, sponsorship });
  const guide = createGuideService({ engine, checkout, pathways, studyPlans, model, budget });
  const translateTasks = createTaskTranslations(
    translationModelOf(config, overrides.taskTranslationModel),
    budget,
  );
  return {
    marketplace,
    courses,
    wallet,
    checkout,
    pathways,
    learning,
    studyPlans,
    sponsorship,
    guide,
    translateTasks,
    beacons: createBeacons(database, clock),
  };
}

/** Learning; a course the seller published is taken at the address it gave. */
function createLearning(foundations: Foundations): LearningService {
  const { enrolments, learners, engine, overrides, sellerCourses } = foundations;
  return createLearningService({
    enrolments,
    learners,
    engine,
    newCertificateId: overrides.newCertificateId ?? (() => newCertificateId()),
    accessUrlOf: (courseId) => sellerCourses.accessUrl(courseId),
  });
}

/** The wallet; an attempt to pay left unanswered is settled by the module that made it. */
function createWallet(
  { config, overrides, database, clock, logger, orders }: Foundations,
  {
    marketplace,
    checkout,
    sponsorship,
  }: Pick<Services, 'marketplace' | 'checkout' | 'sponsorship'>,
): WalletService {
  return createWalletService({
    database,
    clock,
    logger,
    payments: config.payments,
    gateways: overrides.gateways ?? gatewaysOf(config),
    marketplace,
    orders,
    settleAttempt: (attempt) =>
      attempt.order.method === 'employer-invoice'
        ? sponsorship.settleAttempt(attempt)
        : checkout.settleAttempt(attempt),
  });
}

async function openMigratedDatabase(url: string, logger: Logger, clock: Clock): Promise<Database> {
  const database = await openDatabase(url);
  const applied = await migrate(database, { clock });
  if (applied.length > 0) {
    logger.info('migrations applied', { migrations: applied.join(', ') });
  }
  return database;
}
