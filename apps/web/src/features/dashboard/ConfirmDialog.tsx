import { useEffect, useId, useRef } from 'react';

import { Button } from '../../components/Button.tsx';

import styles from './Dashboard.module.css';

interface ConfirmDialogProps {
  /** Whether the question is asked; the dialog opens and closes with it. */
  readonly open: boolean;
  readonly title: string;
  readonly body: string;
  readonly confirmLabel: string;
  readonly cancelLabel: string;
  readonly onCancel: () => void;
  readonly onConfirm: () => void;
}

/** Asks before an action that moves money or tells someone else: what happens, and a way back. */
export function ConfirmDialog(props: ConfirmDialogProps) {
  const { open, title, body, confirmLabel, cancelLabel, onCancel, onConfirm } = props;
  const titleId = useId();
  const dialog = useRef<HTMLDialogElement>(null);
  // A native modal dialog opens only through its DOM method.
  useEffect(() => {
    const element = dialog.current;
    if (open && element?.open === false) {
      element.showModal();
      // The way back takes the focus, so a second Enter never confirms by accident.
      element.querySelector<HTMLElement>('[data-initial-focus]')?.focus();
    } else if (!open && element?.open === true) {
      element.close();
    }
  }, [open]);
  return (
    <dialog ref={dialog} className={styles.dialog} aria-labelledby={titleId} onCancel={onCancel}>
      {open && (
        <div className={styles.dialogBody}>
          <h2 id={titleId}>{title}</h2>
          <p>{body}</p>
          <div className={styles.links}>
            <Button primary onClick={onConfirm}>
              {confirmLabel}
            </Button>
            <Button onClick={onCancel} data-initial-focus>
              {cancelLabel}
            </Button>
          </div>
        </div>
      )}
    </dialog>
  );
}
