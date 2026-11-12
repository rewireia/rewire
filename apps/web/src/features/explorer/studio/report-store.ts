import type { AgReportState } from 'ag-studio';

import type { Language } from '../../../app/preferences.ts';
import type { SafeStorage } from '../../../app/storage.ts';

import type { RewireRegistry } from './registry.ts';

/** A report of the dashboard, with Rewire's own widgets. */
type Report = AgReportState<RewireRegistry>;

/** The storage the store uses, refusals included, so that tests can pass their own. */
export type ReportStorage = SafeStorage;

/**
 * One saved layout per language, since the titles are written in it. The version changes when the
 * shipped dashboard changes in a way an older saved layout would not fit.
 */
function keyOf(language: Language): string {
  return `rewire.explore.studio.v2.${language}`;
}

function isReport(value: unknown): value is Report {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  // Only the two fields Studio needs to open a report are checked; Studio checks the rest.
  const { pages, selectedPageId } = value as Partial<Record<keyof Report, unknown>>;
  return Array.isArray(pages) && pages.length > 0 && typeof selectedPageId === 'string';
}

/** The layout this browser saved, or `null`; storage that is refused or unreadable counts as none. */
export function loadReport(storage: ReportStorage, language: Language): Report | null {
  const stored = storage.getItem(keyOf(language));
  if (stored === null) {
    return null;
  }
  try {
    const parsed: unknown = JSON.parse(stored);
    return isReport(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

/** Keeps the layout; returns whether the browser accepted it. */
export function saveReport(
  storage: ReportStorage,
  language: Language,
  report: AgReportState,
): boolean {
  return storage.setItem(keyOf(language), JSON.stringify(report));
}

/** Forgets the saved layout, so the shipped dashboard opens next time. */
export function clearReport(storage: ReportStorage, language: Language): void {
  // Storage that refuses to change holds nothing of ours either.
  storage.removeItem(keyOf(language));
}
