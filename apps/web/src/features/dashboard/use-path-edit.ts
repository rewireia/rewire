import type { Region } from '@rewire/contracts';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { api } from '../../api/instance.ts';

/**
 * Saves the courses the learner keeps added to their path; the roadmap and the plan in time
 * are read again, so the chart shows the change with the dates the server gives it.
 */
export function usePathEdit(region: Region) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (courseIds: readonly string[]) => api.saveRoadmap(region, [...courseIds]),
    onSettled: () =>
      Promise.all([
        client.invalidateQueries({ queryKey: ['roadmap'] }),
        client.invalidateQueries({ queryKey: ['study-plan'] }),
      ]),
  });
}
