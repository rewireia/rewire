import type {
  ExplanationRequest,
  GuideRequest,
  GuideStatus,
  InterpretRequest,
  Region,
} from '@rewire/contracts';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api, STATIC } from './instance.ts';

function useGuideStatus() {
  return useQuery({
    queryKey: ['guide-status'],
    queryFn: ({ signal }) => api.guideStatus(signal),
    ...STATIC,
  });
}

/** Whether the guide answers on this server; `false` while unknown or unreachable. */
export function useGuideAvailable(): boolean {
  return useGuideStatus().data?.available === true;
}

/**
 * Who reads what a person writes to the guide, and whether they may learn from it. Nothing
 * is claimed while the server has not said; the guide shows no field to write in until then.
 */
export function useGuideDisclosure(): Pick<GuideStatus, 'provider' | 'usedToImproveModels'> {
  const { data } = useGuideStatus();
  return {
    provider: data?.provider ?? null,
    usedToImproveModels: data?.usedToImproveModels ?? false,
  };
}

export function useInterpret(region: Region) {
  return useMutation({ mutationFn: (body: InterpretRequest) => api.interpret(region, body) });
}

export function useExplanation(isco08: string) {
  return useMutation({
    mutationFn: (body: ExplanationRequest) => api.explanation(isco08, body),
  });
}

export function useGuideMessage() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (body: GuideRequest) => api.guideMessage(body),
    onSuccess: (reply) => {
      // A plan the guide changed is read again wherever it is shown; the change may also
      // have given a visitor their session.
      if (reply.cards.some((card) => card.type === 'plan' && card.changed)) {
        void client.invalidateQueries({ queryKey: ['study-plan'] });
        void client.invalidateQueries({ queryKey: ['session'] });
      }
    },
  });
}
