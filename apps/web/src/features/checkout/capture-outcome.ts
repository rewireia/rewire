import type { CaptureResult, TopUpResult } from '@rewire/contracts';

/** How a payment stands once the server captured it: an order of a course, or a top-up. */
export type Settled = Pick<CaptureResult, 'issue'> & {
  readonly status: CaptureResult['status'] | TopUpResult['status'];
};

/** What the person is told after PayPal's approval, from the server's capture. */
export type CaptureOutcome =
  'completed' | 'held' | 'review' | 'failed' | 'mismatch' | 'not-approved' | 'refunded';

export function captureOutcome({ status, issue }: Settled): CaptureOutcome {
  if (issue === 'mismatch' || status === 'mismatched') {
    return 'mismatch';
  }
  // PayPal answered, but not in a way the server could read: the course is kept for the person.
  if (issue === 'needs-review') {
    return 'review';
  }
  switch (status) {
    case 'completed':
      return 'completed';
    case 'refunded':
      return 'refunded';
    case 'failed':
      return 'failed';
    case 'pending':
      return issue === 'not-approved' ? 'not-approved' : 'held';
    case 'created':
      return 'not-approved';
  }
}
