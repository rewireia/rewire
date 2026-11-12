import type { Region } from '@rewire/contracts';
import type { Config } from './config.ts';
import { createOpenAiStudioModel, type StudioModel } from './modules/analyst/studio-model.ts';
import type { PaymentGateway } from './modules/checkout/gateway.ts';
import { createPayPalGateway } from './modules/checkout/paypal-gateway.ts';
import type { GuideModel } from './modules/guide/model.ts';
import {
  createTaskTranslationModel,
  type TaskTranslationModel,
} from './modules/exposure/translation.ts';
import { createOpenAiModel } from './modules/guide/openai-model.ts';
import type { TokenBudgetLimits } from './modules/guide/token-budget.ts';
import type { InvoicingGateway } from './modules/sponsorship/invoicing.ts';
import { createPayPalInvoicing } from './modules/sponsorship/paypal-invoicing.ts';
import { createPayPalRest } from './modules/sponsorship/paypal-rest.ts';
import type { Clock } from './platform/clock.ts';

/** One gateway per merchant, shared by the regions that sell through the same one. */
export function gatewaysOf(config: Config): Partial<Record<Region, PaymentGateway>> {
  const byClientId = new Map<string, PaymentGateway>();
  const gateways: Partial<Record<Region, PaymentGateway>> = {};
  for (const region of ['eu', 'us', 'uk'] as const) {
    const merchant = config.payments.merchants[region];
    if (merchant !== undefined) {
      const gateway =
        byClientId.get(merchant.clientId) ??
        createPayPalGateway(merchant, config.payments.environment);
      byClientId.set(merchant.clientId, gateway);
      gateways[region] = gateway;
    }
  }
  return gateways;
}

/** Invoicing for every region that has a merchant, through PayPal's REST API. */
export function invoicingOf(
  config: Config,
  clock: Clock,
): Partial<Record<Region, InvoicingGateway>> {
  const invoicing: Partial<Record<Region, InvoicingGateway>> = {};
  for (const region of ['eu', 'us', 'uk'] as const) {
    const merchant = config.payments.merchants[region];
    if (merchant !== undefined) {
      invoicing[region] = createPayPalInvoicing(
        createPayPalRest(merchant, config.payments.environment, clock),
      );
    }
  }
  return invoicing;
}

/**
 * What one call may spend, up to the input of its last round: a call of the guide (up to eight
 * rounds with its tools, each sending the turn again) or a turn of the analyst (about 10,000 tokens
 * in, its answer within the rest). Four calls may run at once.
 */
const TOKENS_PER_CALL = { guide: 40_000, analyst: 20_000 } as const;

export function limitsOf(dailyTokens: number, of: keyof typeof TOKENS_PER_CALL): TokenBudgetLimits {
  return { dailyTokens, tokensPerCall: TOKENS_PER_CALL[of], concurrentCalls: 4 };
}

/** The model of the guide, when the server has a key for one. */
export function modelOf({ model }: Config['guide']): GuideModel | undefined {
  return model === undefined ? undefined : createOpenAiModel(model);
}

/**
 * The model behind the analyst: the guide's own, when the server has a key for it. Studio's
 * agents work in many small steps, each a turn of the model, so each one reasons at low effort.
 */
export function studioModelOf({ model }: Config['guide']): StudioModel | undefined {
  return model === undefined ? undefined : createOpenAiStudioModel({ ...model, effort: 'low' });
}

export function webhookIdsOf(config: Config): string[] {
  const ids = Object.values(config.payments.merchants).flatMap((merchant) =>
    merchant.webhookId === undefined ? [] : [merchant.webhookId],
  );
  return [...new Set(ids)];
}

/** The model used only for translating official tasks. */
export function translationModelOf(
  config: Config,
  override: TaskTranslationModel | null | undefined,
): TaskTranslationModel | undefined {
  if (override !== undefined) return override ?? undefined;
  return config.guide.model === undefined
    ? undefined
    : createTaskTranslationModel(config.guide.model);
}
