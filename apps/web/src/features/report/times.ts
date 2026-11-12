import type { TimeShare } from '@rewire/contracts';

export type TimeByTask = Readonly<Record<string, TimeShare>>;

/** Whether two answers give every task the same time; a task left out counts as `some`. */
export function sameTimes(left: TimeByTask, right: TimeByTask): boolean {
  const ids = new Set([...Object.keys(left), ...Object.keys(right)]);
  return [...ids].every((id) => (left[id] ?? 'some') === (right[id] ?? 'some'));
}
