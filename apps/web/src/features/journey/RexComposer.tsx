import { useState, type SubmitEvent, type KeyboardEvent } from 'react';
import { useMessages } from '../../i18n/use-messages.ts';
import { GuidePrivacy } from '../guide/GuidePrivacy.tsx';
import styles from './RexChat.module.css';

export function RexComposer({
  pending,
  onSend,
}: {
  readonly pending: boolean;
  readonly onSend: (text: string) => void;
}) {
  const { t } = useMessages();
  const [text, setText] = useState('');
  const send = () => {
    const trimmed = text.trim();
    if (trimmed.length < 2 || pending) return;
    onSend(trimmed);
    setText('');
  };
  const submit = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    send();
  };
  const keyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      send();
    }
  };
  return (
    <form className={styles.composer} onSubmit={submit}>
      <div className={styles.inputRow}>
        <label className="visually-hidden" htmlFor="journey-work">
          {t('conversation.work.label')}
        </label>
        <textarea
          id="journey-work"
          rows={2}
          maxLength={600}
          value={text}
          placeholder={t('conversation.rex.placeholder')}
          onChange={(event) => {
            setText(event.target.value);
          }}
          onKeyDown={keyDown}
        />
        <button type="submit" disabled={pending || text.trim().length < 2}>
          {t('conversation.send')}
        </button>
      </div>
      <GuidePrivacy className={styles.privacy} />
    </form>
  );
}
