import type { GuideStatus } from '@rewire/contracts';

import type { MessageKey } from '../../i18n/en.ts';

/** Who reads what a person writes to the model, and whether they may learn from it. */
export type Disclosure = Pick<GuideStatus, 'provider' | 'usedToImproveModels'>;

/**
 * What the privacy page says about where a person's words to Rex or Tempo go, sentence by
 * sentence: who answers them and, when the server says so, that the provider may learn from them.
 */
export function privacyKeys({ provider, usedToImproveModels }: Disclosure): MessageKey[] {
  const reader: MessageKey =
    provider === 'openai' ? 'method.privacy.guide.openai' : 'method.privacy.guide.other';
  return usedToImproveModels ? [reader, 'guide.privacy.learns'] : [reader];
}
