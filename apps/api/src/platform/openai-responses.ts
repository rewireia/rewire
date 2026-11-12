import type { Fetch } from './fetch.ts';

const RESPONSES_URL = 'https://api.openai.com/v1/responses';
/** Reasoning takes its time; past this the request is given up. */
const REQUEST_TIMEOUT_MS = 120_000;

/** OpenAI could not be reached, refused the request, or answered something that is not JSON. */
export class OpenAiCallError extends Error {
  override readonly name = 'OpenAiCallError';
}

/**
 * Sends one request to OpenAI's Responses API and returns the JSON of its answer. A refused key
 * (401), a spent quota (429) or any other failure is an `OpenAiCallError`, with what OpenAI said
 * kept as its message for the log.
 */
export async function postResponses(
  fetcher: Fetch,
  apiKey: string,
  body: unknown,
): Promise<unknown> {
  let response: Response;
  let text: string;
  try {
    response = await fetcher(RESPONSES_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    text = await response.text();
  } catch (error) {
    throw new OpenAiCallError('OpenAI could not be reached', { cause: error });
  }
  if (!response.ok) {
    throw new OpenAiCallError(`OpenAI answered ${String(response.status)}: ${text.slice(0, 500)}`);
  }
  try {
    return JSON.parse(text) as unknown;
  } catch (error) {
    throw new OpenAiCallError('OpenAI answered something that is not JSON', { cause: error });
  }
}
