import { useEffect, useRef } from 'react';

import { useGuideAvailable } from '../../api/guide-queries.ts';

import { useGuideQuestion } from './ask-guide.ts';
import styles from './Guide.module.css';
import { GuidePanel } from './GuidePanel.tsx';

/**
 * Tempo's side panel, when this server has a guide: a native modal dialog that opens when another
 * part of the page asks it something (`askGuide`), as Tempo's block on the roadmap does. Once
 * opened it stays mounted, so the conversation is kept between openings.
 */
export function GuideLauncher() {
  const available = useGuideAvailable();
  const dialog = useRef<HTMLDialogElement>(null);
  const question = useGuideQuestion();
  const opened = question !== null;
  useEffect(() => {
    if (opened && available && dialog.current?.open === false) {
      dialog.current.showModal();
    }
  }, [question, opened, available]);
  if (!available) {
    return null;
  }
  return (
    <dialog ref={dialog} className={styles.dialog} aria-labelledby="guide-title">
      {opened && (
        <GuidePanel
          question={question}
          onClose={() => {
            dialog.current?.close();
          }}
        />
      )}
    </dialog>
  );
}
