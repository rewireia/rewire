/**
 * The band of a task score, as the ILO defines it in the data dictionary of its index:
 * very low below 0.25, low from 0.25, medium from 0.50 and high from 0.75.
 */
export type TaskBand = 'very-low' | 'low' | 'medium' | 'high';

/** Every band, from the most to the least exposed. */
export const TASK_BANDS: readonly TaskBand[] = ['high', 'medium', 'low', 'very-low'];

const LOW_FROM = 0.25;
const MEDIUM_FROM = 0.5;
const HIGH_FROM = 0.75;

export function taskBandOf(score: number): TaskBand {
  if (score >= HIGH_FROM) {
    return 'high';
  }
  if (score >= MEDIUM_FROM) {
    return 'medium';
  }
  return score >= LOW_FROM ? 'low' : 'very-low';
}
