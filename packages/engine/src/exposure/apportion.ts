/**
 * Splits a total among weights in whole steps, by the largest-remainder method, so the
 * parts always add up to the total: 100 points in steps of 5 never come out as 95 or 105.
 *
 * With no weight at all, every part is zero.
 */
export function apportion(weights: readonly number[], total: number, step: number): number[] {
  const weightSum = weights.reduce((sum, weight) => sum + weight, 0);
  if (weightSum === 0) {
    return weights.map(() => 0);
  }
  const steps = Math.round(total / step);
  const exact = weights.map((weight) => (weight / weightSum) * steps);
  const parts = exact.map(Math.floor);
  const stepsLeft = steps - parts.reduce((sum, part) => sum + part, 0);

  const byLargestRemainder = exact
    .map((value, position) => ({ position, remainder: value - Math.floor(value) }))
    .toSorted((a, b) => b.remainder - a.remainder || a.position - b.position);
  for (const { position } of byLargestRemainder.slice(0, stepsLeft)) {
    parts[position] = (parts[position] ?? 0) + 1;
  }
  return parts.map((part) => part * step);
}
