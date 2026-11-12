import { isRunning } from './offer-terms.ts';
import { useOfferNow } from './use-offer-now.ts';

/** Whether the offer ending at `endsAt` still runs; it turns false by itself at the end. */
export function useRunning(endsAt: string | null): boolean {
  const now = useOfferNow(endsAt);
  return endsAt !== null && isRunning(endsAt, now);
}
