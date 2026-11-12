import { regionSchema, unitGroupCodeSchema, type Region } from '@rewire/contracts';
import { useSyncExternalStore } from 'react';

import { safeStorage } from './storage.ts';

export type Language = 'en' | 'es';
type JourneyRole = 'learner' | 'business';
export type ThemeChoice = 'system' | 'light' | 'dark';
/** How the plan in time is shown. */
export type PlanView = 'timeline' | 'list';
/** How the explorer shows the occupations. */
export type ExploreView = 'table' | 'analyse';

/** The occupation a person confirmed, to find it again in the explorer. */
interface ChosenOccupation {
  readonly region: Region;
  readonly code: string;
  readonly title: string;
  readonly isco08: string;
}

/** The only state kept in the browser, and nothing of it leaves it. */
export interface Preferences {
  readonly region: Region;
  readonly journeyRole: JourneyRole;
  /** False until the person chooses a region in this browser: the region shown is a default. */
  readonly regionChosen: boolean;
  readonly language: Language;
  readonly theme: ThemeChoice;
  readonly occupation: ChosenOccupation | null;
  /** The view of the plan in time the person chose last; `null` until they choose one. */
  readonly planView: PlanView | null;
  /** The view of the explorer the person chose last; `null` until they choose one. */
  readonly exploreView: ExploreView | null;
}

const STORAGE_KEY = 'rewire.preferences';
const ROLES: readonly JourneyRole[] = ['learner', 'business'];
const LANGUAGES: readonly Language[] = ['en', 'es'];
const THEMES: readonly ThemeChoice[] = ['system', 'light', 'dark'];
const PLAN_VIEWS: readonly PlanView[] = ['timeline', 'list'];
const EXPLORE_VIEWS: readonly ExploreView[] = ['table', 'analyse'];

const DEFAULTS: Preferences = {
  region: 'us',
  journeyRole: 'learner',
  regionChosen: false,
  // English first, whatever the browser speaks; Spanish is chosen in the header and remembered.
  language: 'en',
  theme: 'dark',
  occupation: null,
  planView: null,
  exploreView: null,
};

function oneOf<T extends string>(options: readonly T[], value: unknown, fallback: T): T {
  return options.find((option) => option === value) ?? fallback;
}

function readOccupation(value: unknown): ChosenOccupation | null {
  if (typeof value !== 'object' || value === null) {
    return null;
  }
  // Every field is checked below before use.
  const { region, code, title, isco08 } = value as Partial<Record<keyof ChosenOccupation, unknown>>;
  const parsedRegion = regionSchema.safeParse(region);
  const parsedCode = unitGroupCodeSchema.safeParse(isco08);
  if (!parsedRegion.success || !parsedCode.success) {
    return null;
  }
  if (typeof code !== 'string' || typeof title !== 'string') {
    return null;
  }
  return { region: parsedRegion.data, code, title, isco08: parsedCode.data };
}

/** Reads stored preferences, keeping only the values that are still valid. */
export function parsePreferences(stored: string | null): Preferences {
  if (stored === null) {
    return DEFAULTS;
  }
  try {
    const raw: unknown = JSON.parse(stored);
    if (typeof raw !== 'object' || raw === null) {
      return DEFAULTS;
    }
    // Every field is checked below before use.
    const fields = raw as Partial<Record<keyof Preferences, unknown>>;
    return {
      region: oneOf(regionSchema.options, fields.region, DEFAULTS.region),
      journeyRole: oneOf(ROLES, fields.journeyRole, DEFAULTS.journeyRole),
      regionChosen: fields.regionChosen === true && regionSchema.safeParse(fields.region).success,
      language: oneOf(LANGUAGES, fields.language, DEFAULTS.language),
      theme: oneOf(THEMES, fields.theme, DEFAULTS.theme),
      occupation: readOccupation(fields.occupation),
      planView: PLAN_VIEWS.find((view) => view === fields.planView) ?? null,
      exploreView: EXPLORE_VIEWS.find((view) => view === fields.exploreView) ?? null,
    };
  } catch {
    return DEFAULTS;
  }
}

/** Without storage the preferences live in memory: they hold for the visit, region included. */
const storage = safeStorage('localStorage');
let current = parsePreferences(storage?.getItem(STORAGE_KEY) ?? null);
const listeners = new Set<() => void>();

/** Mirrors the language and the theme on the document, for CSS and assistive technology. */
export function applyToDocument(preferences: Preferences = current): void {
  const root = document.documentElement;
  root.lang = preferences.language;
  if (preferences.theme === 'system') {
    delete root.dataset.theme;
  } else {
    root.dataset.theme = preferences.theme;
  }
}

/** Changes some preferences and keeps them; choosing a region marks it as the person's own. */
export function updatePreferences(change: Partial<Preferences>): void {
  current = {
    ...current,
    ...change,
    ...(change.region === undefined ? {} : { regionChosen: true }),
  };
  storage?.setItem(STORAGE_KEY, JSON.stringify(current));
  applyToDocument(current);
  listeners.forEach((listener) => {
    listener();
  });
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** The preferences as they are now. */
export function readPreferences(): Preferences {
  return current;
}

export function usePreferences(): Preferences {
  return useSyncExternalStore(subscribe, readPreferences);
}
