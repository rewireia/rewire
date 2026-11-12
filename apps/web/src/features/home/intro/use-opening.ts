import { useEffect, useState } from 'react';

import { INTRO_MS, introBeats } from './timeline.ts';

type Phase = 'typing' | 'blinking' | 'reveal' | 'leaving';

/** Runs the opening once; skipping cancels every pending beat before the gentle handover. */
export function useOpening(active: boolean, length: number, onDone: () => void) {
  const [typed, setTyped] = useState(0);
  const [phase, setPhase] = useState<Phase>('typing');
  useEffect(() => {
    if (!active) {
      return;
    }
    const beats = introBeats(length);
    const timers: number[] = [];
    const at = (ms: number, run: () => void) => {
      timers.push(window.setTimeout(run, ms));
    };
    const clear = () => {
      timers.forEach((timer) => {
        window.clearTimeout(timer);
      });
    };
    let leaving = false;
    const leave = (event?: Event) => {
      // Space and touch must not scroll the scene while they skip the opening.
      event?.preventDefault();
      if (!leaving) {
        leaving = true;
        clear();
        setPhase('leaving');
        at(INTRO_MS.leave, onDone);
      }
    };
    for (let letters = 1; letters <= length; letters += 1) {
      at(INTRO_MS.typeStart + beats.letter * letters, () => {
        setTyped(letters);
      });
    }
    at(beats.typed, () => {
      setPhase('blinking');
    });
    at(beats.reveal, () => {
      setPhase('reveal');
    });
    at(beats.leave, leave);
    window.addEventListener('keydown', leave);
    window.addEventListener('pointerdown', leave);
    return () => {
      clear();
      window.removeEventListener('keydown', leave);
      window.removeEventListener('pointerdown', leave);
    };
  }, [active, length, onDone]);
  return { typed, phase };
}
