import { problemSchema, type Problem } from '@rewire/contracts';

/** What the client needs from a schema of the contracts. */
export interface AnswerSchema<T> {
  safeParse(input: unknown): { success: true; data: T } | { success: false };
}

/** Codes of the problems the client finds itself, before or after the server answers. */
export const CLIENT_PROBLEM = { network: 'network', invalidAnswer: 'invalid_answer' } as const;

/** A failed request, with the problem the server described or one the client found. */
export class ApiError extends Error {
  override readonly name = 'ApiError';
  readonly problem: Problem;

  constructor(problem: Problem) {
    super(problem.detail ?? problem.title);
    this.problem = problem;
  }
}

/** The stable code of a failure, or `undefined` when it is not a problem of the API. */
export function problemCode(error: unknown): string | undefined {
  return error instanceof ApiError ? error.problem.code : undefined;
}

function clientProblem(code: string, title: string, status = 0): ApiError {
  return new ApiError({ status, code, title });
}

async function readJson(response: Response): Promise<unknown> {
  if (response.status === 204) {
    return null;
  }
  try {
    return await response.json();
  } catch {
    return undefined;
  }
}

export type Request = <T>(path: string, schema: AnswerSchema<T>, init?: RequestInit) => Promise<T>;

/** Sends one request and validates its answer, or turns the failure into an `ApiError`. */
export function requester(fetchFn: typeof fetch, base: string): Request {
  return async (path, schema, init = {}) => {
    const headers = new Headers(init.headers);
    headers.set('accept', 'application/json');
    let response: Response;
    try {
      response = await fetchFn(`${base}${path}`, { ...init, headers });
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw error;
      }
      throw clientProblem(CLIENT_PROBLEM.network, 'Network error');
    }
    const body = await readJson(response);
    if (!response.ok) {
      const problem = problemSchema.safeParse(body);
      throw problem.success
        ? new ApiError(problem.data)
        : clientProblem(CLIENT_PROBLEM.invalidAnswer, 'Unreadable error', response.status);
    }
    const answer = schema.safeParse(body);
    if (!answer.success) {
      throw clientProblem(CLIENT_PROBLEM.invalidAnswer, 'Unexpected answer', response.status);
    }
    return answer.data;
  };
}

/** The options of a request that sends JSON. */
export function sendJson(
  method: 'POST' | 'PUT',
  body?: unknown,
  signal?: AbortSignal,
): RequestInit {
  return {
    method,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body ?? {}),
    signal: signal ?? null,
  };
}

/** An answer with no body, such as a 204. */
export const NO_CONTENT: AnswerSchema<null> = {
  safeParse: (input) => (input === null ? { success: true, data: null } : { success: false }),
};

/** A path segment, escaped. */
export const segment = encodeURIComponent;
