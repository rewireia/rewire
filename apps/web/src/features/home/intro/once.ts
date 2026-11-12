import { safeStorage, type SafeStorage } from '../../../app/storage.ts';

const PLAYED_KEY = 'rewire.opening';

/** What decides whether the opening plays: the visit's storage and the motion allowed. */
export interface OpeningConditions {
  /** The storage of this browser session; `null` when the browser refuses it. */
  readonly storage: Pick<SafeStorage, 'getItem' | 'setItem'> | null;
  readonly reducedMotion: boolean;
}

/**
 * Whether the opening plays on this load, marking the session as opened either way. It plays
 * once per browser session, only when the site opens at its home page and only if the person
 * allows motion. Without storage it never plays: nothing could keep it from playing every time.
 */
export function claimOpening(conditions: OpeningConditions, atHome: boolean): boolean {
  const { storage, reducedMotion } = conditions;
  if (storage === null) {
    return false;
  }
  if (storage.getItem(PLAYED_KEY) !== null || !storage.setItem(PLAYED_KEY, '1')) {
    return false;
  }
  return atHome && !reducedMotion;
}

function browserConditions(): OpeningConditions {
  const storage = safeStorage('sessionStorage');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  return { storage, reducedMotion };
}

let pending: boolean | null = null;

/** Decides at the first address of this load; later calls change nothing. */
export function decideOpening(atHome: boolean): void {
  pending ??= claimOpening(browserConditions(), atHome);
}

/** True while the opening decided for this load has not been played. */
export function openingPending(): boolean {
  return pending === true;
}

/** The opening played or was skipped: coming back home later does not play it again. */
export function openingPlayed(): void {
  pending = false;
}
