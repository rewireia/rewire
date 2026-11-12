import type { OccupationMatch, Region } from '@rewire/contracts';
import { useEffect, useRef, type ReactNode } from 'react';
import { usePreferences } from '../../app/preferences.ts';
import { Mark } from '../../components/Mark.tsx';
import { useMessages } from '../../i18n/use-messages.ts';
import { RexComposer } from './RexComposer.tsx';
import styles from './RexChat.module.css';
import { RexWelcome } from './RexWelcome.tsx';
import { Results } from './SearchCandidates.tsx';

export type ChatTurn =
  | { readonly kind: 'person'; readonly text: string; readonly purpose?: 'social' | 'work' }
  | {
      readonly kind: 'social';
      readonly key: 'greeting' | 'thanks' | 'help' | 'identity' | 'outOfScope';
    }
  | {
      readonly kind: 'reply';
      readonly note: string | null;
      readonly matches: readonly OccupationMatch[];
      readonly error: unknown;
      readonly region: Region;
      readonly language: 'en' | 'es';
    };

export function RexChat({
  turns,
  pending,
  onSend,
  onChoose,
  children,
}: {
  readonly turns: readonly ChatTurn[];
  readonly pending: boolean;
  readonly onSend: (text: string) => void;
  readonly onChoose: (match: OccupationMatch) => void;
  readonly children: ReactNode;
}) {
  const { t, language } = useMessages();
  const transcript = useRef<HTMLDivElement>(null);
  const hasTasks = children !== null;
  const latestReply = turns.findLastIndex((turn) => turn.kind === 'reply');
  const newerWork = turns
    .slice(latestReply + 1)
    .some((turn) => turn.kind === 'person' && turn.purpose !== 'social');
  useEffect(() => {
    const view = transcript.current;
    if (view) view.scrollTop = view.scrollHeight;
  }, [turns.length, pending, hasTasks]);
  return (
    <section className={styles.chat} aria-labelledby="rex-title">
      <ChatHeader />
      <div
        className={styles.transcript}
        ref={transcript}
        aria-live="polite"
        aria-relevant="additions"
      >
        <RexWelcome key={language} />
        {turns.map((turn, index) => (
          <ChatMessage
            key={index}
            turn={turn}
            onChoose={onChoose}
            active={!pending && !newerWork && children === null && index === latestReply}
          />
        ))}
        {pending && <TypingIndicator label={t('conversation.rex.typing')} />}
        {children && <TaskMessage>{children}</TaskMessage>}
      </div>
      {children === null && <RexComposer pending={pending} onSend={onSend} />}
    </section>
  );
}

function TypingIndicator({ label }: { readonly label: string }) {
  return (
    <div className={styles.messageRow} role="status" aria-label={label}>
      <span className={styles.avatar} aria-hidden="true">
        <Mark size={20} />
      </span>
      <span className={styles.typing} aria-hidden="true">
        <i data-typing-dot />
        <i data-typing-dot />
        <i data-typing-dot />
      </span>
    </div>
  );
}

function TaskMessage({ children }: { readonly children: ReactNode }) {
  return (
    <div className={styles.messageRow}>
      <span className={styles.avatar}>
        <Mark size={20} />
      </span>
      <div className={`${styles.messageBody} ${styles.taskBubble}`}>
        <span className={styles.author}>Rex</span>
        {children}
      </div>
    </div>
  );
}

function ChatHeader() {
  const { t } = useMessages();
  return (
    <header className={styles.chatHeader}>
      <span className={styles.headerMark}>
        <Mark size={24} />
      </span>
      <div>
        <h1 id="rex-title">Rex</h1>
        <p>{t('conversation.rex.subtitle')}</p>
      </div>
    </header>
  );
}

function ChatMessage({
  turn,
  onChoose,
  active,
}: {
  readonly turn: ChatTurn;
  readonly onChoose: (match: OccupationMatch) => void;
  readonly active: boolean;
}) {
  const { t } = useMessages();
  const { region } = usePreferences();
  if (turn.kind === 'person')
    return (
      <div className={styles.personRow}>
        <p className={styles.personBubble}>{turn.text}</p>
      </div>
    );
  if (turn.kind === 'social')
    return <SocialMessage text={t(`conversation.rex.social.${turn.key}`)} />;
  return (
    <div className={styles.messageRow}>
      <span className={styles.avatar}>
        <Mark size={20} />
      </span>
      <div className={styles.messageBody}>
        <span className={styles.author}>Rex</span>
        <div className={styles.bubble}>
          {turn.region === region ? (
            <Results
              note={turn.note}
              language={turn.language}
              matches={turn.matches}
              error={turn.error}
              onChoose={onChoose}
              active={active}
            />
          ) : (
            <p lang={turn.note ? turn.language : undefined}>
              {turn.note ?? t('conversation.rex.previous')}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function SocialMessage({ text }: { readonly text: string }) {
  return (
    <div className={styles.messageRow}>
      <span className={styles.avatar}>
        <Mark size={20} />
      </span>
      <div className={styles.messageBody}>
        <span className={styles.author}>Rex</span>
        <p className={styles.bubble}>{text}</p>
      </div>
    </div>
  );
}
