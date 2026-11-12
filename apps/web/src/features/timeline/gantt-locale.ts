import { LocaleManager } from '@bryntum/core-community';
// Each module publishes Bryntum's own texts in its language: Core, Grid, Scheduler and Gantt.
import '@bryntum/gantt-community/lib/Gantt/localization/En.js';
import '@bryntum/gantt-community/lib/Gantt/localization/Es.js';

import type { Language } from '../../app/preferences.ts';

const BRYNTUM_LOCALES: Readonly<Record<Language, string>> = { en: 'En', es: 'Es' };

/** Bryntum's own texts and date formats follow the language of the interface. */
export function applyGanttLocale(language: Language): void {
  void LocaleManager.applyLocale(BRYNTUM_LOCALES[language]);
}
