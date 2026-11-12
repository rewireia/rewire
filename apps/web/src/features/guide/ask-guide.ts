import { useSyncExternalStore } from 'react';

/** A question another part of the page asks the guide to take up. */
export interface GuideQuestion {
  readonly id: number;
  readonly text: string;
}

let latest: GuideQuestion | null = null;
const listeners = new Set<() => void>();

function notify(): void {
  listeners.forEach((listener) => {
    listener();
  });
}

/** Opens the guide's panel and asks it this question, as if the person had written it. */
export function askGuide(text: string): void {
  latest = { id: (latest?.id ?? 0) + 1, text };
  notify();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** The last question asked from outside the panel, or `null` until one is. */
export function useGuideQuestion(): GuideQuestion | null {
  return useSyncExternalStore(subscribe, () => latest);
}
