import { useMemo } from 'react';

import { usePreferences, type Language } from '../app/preferences.ts';

import type { MessageKey } from './en.ts';
import { formatPoints, translate, type MessageValues } from './format.ts';

export interface Messages {
  readonly language: Language;
  readonly t: (key: MessageKey, values?: MessageValues) => string;
  readonly points: (score: number) => string;
}

/** The messages and number formats of the language the person chose. */
export function useMessages(): Messages {
  const { language } = usePreferences();
  return useMemo(
    () => ({
      language,
      t: (key, values) => translate(language, key, values),
      points: (score) => formatPoints(score, language),
    }),
    [language],
  );
}
