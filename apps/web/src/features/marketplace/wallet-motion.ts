import { useEffect, useRef, useState } from 'react';

/** How long the balance takes to rise to a new amount, once. */
export const RISE_MS = 1000;

/** Fast at first, then settling: the curve of the rise. */
function easeOut(progress: number): number {
  return 1 - (1 - progress) ** 3;
}

/** The amount shown at a moment of the rise from one balance to the next. */
export function riseAt(from: number, to: number, elapsed: number, duration = RISE_MS): number {
  if (elapsed >= duration) return to;
  return Math.round(from + (to - from) * easeOut(Math.max(0, elapsed) / duration));
}

/**
 * The balance as shown: when it grows, it rises to the new amount once, in about a second, and
 * stops. A balance that falls, or a person who asks for less motion, sees the amount at once.
 */
export function useRisingAmount(target: number, still: boolean): number {
  const [shown, setShown] = useState(target);
  const previous = useRef(target);
  useEffect(() => {
    const from = previous.current;
    previous.current = target;
    let frame = 0;
    if (still || target <= from) {
      frame = requestAnimationFrame(() => {
        setShown(target);
      });
      return () => {
        cancelAnimationFrame(frame);
      };
    }
    const start = performance.now();
    const step = (now: number) => {
      const value = riseAt(from, target, now - start);
      setShown(value);
      if (value !== target) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => {
      cancelAnimationFrame(frame);
    };
  }, [target, still]);
  return still || target < shown ? target : shown;
}
