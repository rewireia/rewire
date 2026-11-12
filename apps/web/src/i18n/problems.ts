import { ApiError, CLIENT_PROBLEM } from '../api/request.ts';

import type { MessageKey } from './en.ts';

/** The problems of the API that the interface says in its own words, in every language. */
export const KNOWN_PROBLEMS = [
  'payments_unavailable',
  'marketplace_conflict',
  'sign_in_required',
  'invalid_credentials',
  'already_enrolled',
  'payment_pending',
  'payment_in_progress',
  'invoice_pending',
  'invoice_not_open',
  'invoice_unconfirmed',
  'certificate_unavailable',
  'invalid_json',
  'payment_provider_error',
  'refund_not_allowed',
  'refund_in_progress',
  'insufficient_balance',
  'sandbox_required',
  'no_session',
  'lessons_incomplete',
  'course_not_completed',
  'guide_unavailable',
  'guide_busy',
  'analyst_busy',
  'guide_budget_spent',
  'guide_refused',
  'guide_truncated',
  'explanation_failed_check',
  'invalid_input',
  'not_found',
] as const;

type KnownProblem = (typeof KNOWN_PROBLEMS)[number];

function isKnown(code: string): code is KnownProblem {
  return KNOWN_PROBLEMS.some((known) => known === code);
}

/** Problems whose way out is on the dashboard, where the person's courses and requests are. */
const SOLVED_ON_DASHBOARD: ReadonlySet<string> = new Set(['invoice_pending', 'already_enrolled']);

/** Whether the person settles this problem from the dashboard. */
export function solvedOnDashboard(error: unknown): boolean {
  return error instanceof ApiError && SOLVED_ON_DASHBOARD.has(error.problem.code);
}

/** The message key of a problem the interface knows. */
export function problemKey(code: KnownProblem): MessageKey {
  return `problem.${code}`;
}

/**
 * What went wrong, said by the stable code of the problem in the person's language. The
 * server's own `detail` is used only for a code the interface does not know.
 */
export function problemMessage(error: unknown, t: (key: MessageKey) => string): string {
  if (!(error instanceof ApiError)) {
    return t('error.network');
  }
  const { code, detail, title } = error.problem;
  if (code === CLIENT_PROBLEM.network) {
    return t('error.network');
  }
  if (code === CLIENT_PROBLEM.invalidAnswer) {
    return t('error.invalidAnswer');
  }
  return isKnown(code) ? t(problemKey(code)) : (detail ?? title);
}
