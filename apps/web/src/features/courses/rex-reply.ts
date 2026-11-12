import type { CatalogueSearchResult } from '@rewire/contracts';

/** What Rex says about an answer, as message keys: the web writes it, never the model. */
export interface RexReply {
  readonly key:
    | 'courses.rex.reply.error'
    | 'courses.rex.reply.none'
    | 'courses.rex.reply.noMore'
    | 'courses.rex.reply.one'
    | 'courses.rex.reply.many'
    | 'courses.rex.reply.more';
  /** The number of courses proposed, which comes from the answer itself. */
  readonly count: number;
  /** Whether to add that the courses were chosen by the words, without the model. */
  readonly byRules: boolean;
}

/**
 * Rex's sentence for one search: a failure, nothing found, or the number of courses the server
 * proposed. `again` is true when the person asked for others.
 */
export function rexReply(
  result: CatalogueSearchResult | null,
  shown: number,
  again: boolean,
): RexReply {
  if (result === null) {
    return { key: 'courses.rex.reply.error', count: 0, byRules: false };
  }
  const byRules = result.engine === 'rules' && shown > 0;
  if (shown === 0) {
    return {
      key: again ? 'courses.rex.reply.noMore' : 'courses.rex.reply.none',
      count: 0,
      byRules,
    };
  }
  if (again) {
    return { key: 'courses.rex.reply.more', count: shown, byRules };
  }
  return {
    key: shown === 1 ? 'courses.rex.reply.one' : 'courses.rex.reply.many',
    count: shown,
    byRules,
  };
}
