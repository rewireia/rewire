import type { GuideMessage, GuideReply, Region } from '@rewire/contracts';
import { useEffect, useId, useRef, useState } from 'react';

import { useGuideMessage } from '../../api/guide-queries.ts';
import { Button } from '../../components/Button.tsx';
import { ErrorNotice } from '../../components/ErrorNotice.tsx';
import { LoadingBar } from '../../components/LoadingBar.tsx';
import { useMessages } from '../../i18n/use-messages.ts';

import type { GuideQuestion } from './ask-guide.ts';
import styles from './Guide.module.css';
import { GuideCards } from './GuideCards.tsx';
import { GuidePrivacy } from './GuidePrivacy.tsx';
import { useGuideContext } from './use-guide-context.ts';

/** The conversation keeps the latest turns; the API takes up to thirty. */
const MAX_MESSAGES = 30;

interface Turn {
  readonly message: GuideMessage;
  readonly reply?: GuideReply;
}

/** Sends each question with the conversation so far, the region, the occupation and the language. */
function useConversation() {
  const { language } = useMessages();
  const { region, isco08 } = useGuideContext();
  const send = useGuideMessage();
  const [turns, setTurns] = useState<readonly Turn[]>([]);
  const ask = (text: string) => {
    const question: GuideMessage = { role: 'user', text: text.trim() };
    const history = turns.flatMap(({ message, reply }) =>
      reply === undefined ? [message] : [message, { role: 'assistant' as const, text: reply.text }],
    );
    const messages = [...history, question].slice(-MAX_MESSAGES);
    setTurns((previous) => [...previous, { message: question }]);
    send.mutate(
      { messages, region, lang: language, ...(isco08 === undefined ? {} : { isco08 }) },
      {
        onSuccess: (reply) => {
          setTurns((previous) =>
            previous.map((turn) => (turn.message === question ? { ...turn, reply } : turn)),
          );
        },
      },
    );
  };
  return { region, turns, send, ask };
}

/** Asks a question that came from outside the panel, once. */
function useOutsideQuestion(question: GuideQuestion | null, ask: (text: string) => void) {
  const asked = useRef(0);
  useEffect(() => {
    if (question !== null && question.id !== asked.current) {
      asked.current = question.id;
      ask(question.text);
    }
  }, [question, ask]);
}

interface GuidePanelProps {
  /** A question asked from elsewhere on the page, such as a suggestion under the plan. */
  readonly question: GuideQuestion | null;
  readonly onClose: () => void;
}

/** The conversation with the guide: what the person asks, what it answers and what it found. */
export function GuidePanel({ question, onClose }: GuidePanelProps) {
  const { t } = useMessages();
  const { region, turns, send, ask } = useConversation();
  useOutsideQuestion(question, ask);
  return (
    <div className={styles.panel}>
      <header className={styles.panelHead}>
        <div>
          <h2 id="guide-title">
            {t('guide.title')} <span className={styles.badge}>{t('guide.badge')}</span>
          </h2>
          <p className={styles.small}>{t('guide.about')}</p>
          <p className={styles.small}>{t('guide.potential')}</p>
        </div>
        <button type="button" className={styles.close} onClick={onClose}>
          {t('guide.close')}
        </button>
      </header>
      <Turns region={region} turns={turns} />
      {send.isPending && <LoadingBar label={t('guide.thinking')} />}
      {send.isError && <ErrorNotice error={send.error} />}
      <QuestionForm pending={send.isPending} onAsk={ask} />
    </div>
  );
}

function Turns({ region, turns }: { readonly region: Region; readonly turns: readonly Turn[] }) {
  const { t } = useMessages();
  const list = useRef<HTMLOListElement>(null);
  const answered = turns.filter((turn) => turn.reply !== undefined).length;
  // The newest turn is kept in view as the conversation grows, without animation.
  useEffect(() => {
    const element = list.current;
    const last = element?.lastElementChild;
    if (element && last instanceof HTMLElement) {
      // The list is the offset parent of its items.
      element.scrollTop = last.offsetTop;
    }
  }, [turns.length, answered]);
  return (
    <ol ref={list} className={styles.turns} aria-live="polite">
      {turns.length === 0 && <li className={styles.small}>{t('guide.empty')}</li>}
      {turns.map(({ message, reply }, index) => (
        // Turns are only ever appended: their place is their key.
        <li key={index} className={styles.turn}>
          <p className={styles.mine}>
            <span className="visually-hidden">{t('guide.you')}: </span>
            {message.text}
          </p>
          {reply !== undefined && (
            <div className={styles.reply}>
              <span className={styles.label}>
                {t('guide.title')} · {t('guide.badge')}
              </span>
              {reply.text.split(/\n{2,}/).map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
              <GuideCards region={region} cards={reply.cards} />
            </div>
          )}
        </li>
      ))}
    </ol>
  );
}

function QuestionForm({
  pending,
  onAsk,
}: {
  readonly pending: boolean;
  readonly onAsk: (text: string) => void;
}) {
  const { t } = useMessages();
  const id = useId();
  const [text, setText] = useState('');
  const submit = () => {
    if (text.trim() === '' || pending) {
      return;
    }
    onAsk(text);
    setText('');
  };
  return (
    <form
      className={styles.form}
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      <label htmlFor={`${id}-text`} className={styles.label}>
        {t('guide.input')}
      </label>
      <textarea
        id={`${id}-text`}
        rows={2}
        maxLength={4000}
        value={text}
        onChange={(event) => {
          setText(event.target.value);
        }}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            submit();
          }
        }}
      />
      <GuidePrivacy className={styles.small} />
      <div>
        <Button type="submit" disabled={pending || text.trim() === ''}>
          {t('guide.send')}
        </Button>
      </div>
    </form>
  );
}
