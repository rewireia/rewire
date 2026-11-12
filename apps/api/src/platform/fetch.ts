/** Sends an HTTP request. Passed in wherever the server calls out, so tests need no network. */
export type Fetch = (url: string, init: RequestInit) => Promise<Response>;
