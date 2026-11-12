import { DEMO_SELLER } from '@rewire/content';

/** The longest description PayPal takes for an order. */
const DESCRIPTION_LIMIT = 127;

/**
 * What the buyer reads at PayPal for an order of courses: the seller, then the course, or how
 * many courses the basket holds.
 */
export function orderDescription(titles: readonly string[]): string {
  const [only] = titles;
  const text =
    titles.length === 1 && only !== undefined
      ? `${DEMO_SELLER.name} — ${only}`
      : `${DEMO_SELLER.name} — ${titles.length} courses`;
  return text.length <= DESCRIPTION_LIMIT ? text : `${text.slice(0, DESCRIPTION_LIMIT - 1)}…`;
}
