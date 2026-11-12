import { REGION_PROFILES } from '@rewire/content';
import type { Region, Wallet } from '@rewire/contracts';
import { z } from 'zod';

import type { Database } from '../../platform/database.ts';

/** What can read the database: the database itself or one of its transactions. */
export interface Reader {
  execute: Database['execute'];
}

/**
 * The balance of a learner's wallet in a region, as two sums the database keeps, never a figure
 * stored on its own: top-ups PayPal captured, and orders paid from the wallet and not refunded.
 */
const BALANCE_SQL = `SELECT
  (SELECT COALESCE(SUM(amount_minor), 0) FROM wallet_top_ups
    WHERE learner_id = :learner AND region = :region AND status = 'completed') funded,
  (SELECT COALESCE(SUM(amount_minor), 0) FROM orders
    WHERE learner_id = :learner AND region = :region AND method = 'wallet'
      AND status = 'completed') spent`;

const balanceRowSchema = z.object({ funded: z.number(), spent: z.number() });

/** The wallet as it stands: what is available is what was added less what was spent. */
export async function walletBalance(
  reader: Reader,
  learnerId: string,
  region: Region,
): Promise<Wallet> {
  const result = await reader.execute({ sql: BALANCE_SQL, args: { learner: learnerId, region } });
  const { funded, spent } = balanceRowSchema.parse(result.rows[0]);
  return {
    region,
    currency: REGION_PROFILES[region].currency,
    fundedMinor: funded,
    spentMinor: spent,
    availableMinor: Math.max(0, funded - spent),
  };
}
