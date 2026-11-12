/** What the middleware stores on every request for the handlers that follow. */
export interface HttpEnvironment {
  Variables: {
    /** Id that ties the answer, the error body and the log lines of one request. */
    requestId: string;
    /** The learner the session cookie belongs to; `undefined` for a visitor. */
    learnerId: string | undefined;
    authenticated: boolean;
    accessRole: 'learner' | 'business' | null;
  };
}
