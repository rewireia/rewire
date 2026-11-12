import {
  explanationSchema,
  guideReplySchema,
  guideStatusSchema,
  interpretResultSchema,
  type Explanation,
  type ExplanationRequest,
  type GuideReply,
  type GuideRequest,
  type GuideStatus,
  type InterpretRequest,
  type InterpretResult,
  type Region,
} from '@rewire/contracts';

import { segment, sendJson, type Request } from './request.ts';

/** The AI guide: whether it is there, reading a description, explaining, conversing. */
export function guideApi(request: Request) {
  return {
    guideStatus(signal?: AbortSignal): Promise<GuideStatus> {
      return request('/guide/status', guideStatusSchema, { signal: signal ?? null });
    },
    interpret(region: Region, body: InterpretRequest): Promise<InterpretResult> {
      const path = `/regions/${region}/occupations/interpret`;
      return request(path, interpretResultSchema, sendJson('POST', body));
    },
    explanation(isco08: string, body: ExplanationRequest): Promise<Explanation> {
      const path = `/unit-groups/${segment(isco08)}/explanation`;
      return request(path, explanationSchema, sendJson('POST', body));
    },
    guideMessage(body: GuideRequest): Promise<GuideReply> {
      return request('/guide/messages', guideReplySchema, sendJson('POST', body));
    },
  };
}
