import { z } from 'zod';

/**
 * One turn of the analyst in the explorer's "Analyse" view, as the web sends it to the server and
 * the server answers it. AG Studio runs the agent loop and every tool in the browser; the server
 * only carries a turn to the model and back, so the model's key never reaches the page.
 */

/** A tool name as the model may call it. */
const toolNameSchema = z.string().regex(/^[A-Za-z0-9_-]{1,64}$/);

/** Upper bounds that a real dashboard conversation stays far below. */
const LIMITS = {
  text: 60_000,
  items: 400,
  tools: 64,
} as const;

const jsonObjectSchema = z.record(z.string(), z.unknown());

/** A message of the conversation: what the person or Studio said, or what the model answered. */
const studioMessageSchema = z.object({
  type: z.literal('message'),
  role: z.enum(['user', 'system', 'assistant']),
  text: z.string().max(LIMITS.text),
});

/** A call the model made to a tool, with its input as JSON text. */
const studioFunctionCallSchema = z.object({
  type: z.literal('function_call'),
  callId: z.string().min(1).max(200),
  name: toolNameSchema,
  arguments: z.string().max(LIMITS.text),
});

/** What a tool returned, read by the model on its next turn. */
const studioFunctionOutputSchema = z.object({
  type: z.literal('function_call_output'),
  callId: z.string().min(1).max(200),
  output: z.string().max(LIMITS.text),
});

export const studioItemSchema = z.discriminatedUnion('type', [
  studioMessageSchema,
  studioFunctionCallSchema,
  studioFunctionOutputSchema,
]);
export type StudioItem = z.infer<typeof studioItemSchema>;

/** A tool the model may call, described by a JSON Schema of its input. */
export const studioToolSchema = z.object({
  name: toolNameSchema,
  description: z.string().max(LIMITS.text),
  parameters: jsonObjectSchema,
});
export type StudioTool = z.infer<typeof studioToolSchema>;

export const studioToolChoiceSchema = z.union([
  z.enum(['auto', 'none', 'required']),
  z.object({ type: z.literal('function'), name: toolNameSchema }),
]);

/** Plain text, or JSON that meets a schema. */
export const studioResponseFormatSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('text') }),
  z.object({
    type: z.literal('json'),
    name: toolNameSchema,
    description: z.string().max(LIMITS.text).optional(),
    schema: jsonObjectSchema,
  }),
]);

export const studioTurnRequestSchema = z.object({
  instructions: z.string().max(LIMITS.text).optional(),
  input: z.array(studioItemSchema).min(1).max(LIMITS.items),
  tools: z.array(studioToolSchema).max(LIMITS.tools).default([]),
  toolChoice: studioToolChoiceSchema.optional(),
  responseFormat: studioResponseFormatSchema.default({ type: 'text' }),
});
export type StudioTurnRequest = z.input<typeof studioTurnRequestSchema>;

/** The model's answer: text, calls to the tools it was given, or both. */
export const studioTurnResponseSchema = z.object({
  id: z.string(),
  /** `incomplete` when the answer was cut short, at its length limit or by a content filter. */
  status: z.enum(['completed', 'incomplete']),
  output: z.array(z.discriminatedUnion('type', [studioMessageSchema, studioFunctionCallSchema])),
  usage: z.object({ inputTokens: z.number().int(), outputTokens: z.number().int() }),
  model: z.string(),
});
export type StudioTurnResponse = z.infer<typeof studioTurnResponseSchema>;
