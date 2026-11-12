import type { Problem } from '@rewire/contracts';
import type { ContentfulStatusCode } from 'hono/utils/http-status';

export interface HttpProblemInit {
  readonly status: ContentfulStatusCode;
  /** Stable, machine-readable name of the problem. */
  readonly code: string;
  /** Short description of the kind of problem. */
  readonly title: string;
  /** What happened this time and what to do, written for a person. */
  readonly detail?: string;
  readonly issues?: Problem['issues'];
}

/**
 * An error the client can act on. Thrown anywhere in a request and turned into a problem
 * answer by the error handler, so handlers never build error bodies by hand.
 */
export class HttpProblem extends Error {
  override readonly name = 'HttpProblem';
  readonly status: ContentfulStatusCode;
  readonly code: string;
  readonly title: string;
  readonly detail: string | undefined;
  readonly issues: Problem['issues'];

  constructor(init: HttpProblemInit) {
    super(init.detail ?? init.title);
    this.status = init.status;
    this.code = init.code;
    this.title = init.title;
    this.detail = init.detail;
    this.issues = init.issues;
  }
}

export function notFound(what: string): HttpProblem {
  return new HttpProblem({
    status: 404,
    code: 'not_found',
    title: 'Not found',
    detail: `${what} does not exist.`,
  });
}

export function invalidInput(issues: NonNullable<Problem['issues']>): HttpProblem {
  return new HttpProblem({
    status: 400,
    code: 'invalid_input',
    title: 'Invalid input',
    detail: 'The request does not have the expected shape.',
    issues,
  });
}
