import type { InterpretResult, OccupationMatch, Region } from '@rewire/contracts';
import { useRef, useState } from 'react';
import { useInterpret } from '../../api/guide-queries.ts';
import { usePreferences } from '../../app/preferences.ts';
import { useMessages } from '../../i18n/use-messages.ts';
import { socialIntent } from './chat-intent.ts';
import { JourneyFrame } from './JourneyFrame.tsx';
import { RexChat, type ChatTurn } from './RexChat.tsx';
import { TaskChoice } from './TaskChoice.tsx';

/** Conversation content is kept in memory only, while confirmed task choices use the profile. */
export function WorkJourney() {
  const { language } = useMessages();
  const { region } = usePreferences();
  const interpret = useInterpret(region);
  const [turns, setTurns] = useState<readonly ChatTurn[]>([]);
  const [selected, setSelected] = useState<OccupationMatch | null>(null);
  const sending = useRef(false);
  const send = (text: string) => {
    if (sending.current) return;
    const intent = socialIntent(text);
    if (intent) {
      setTurns((previous) => [
        ...previous,
        { kind: 'person', text, purpose: 'social' },
        { kind: 'social', key: intent },
      ]);
      return;
    }
    sending.current = true;
    const context = makeContext(turns, text);
    setTurns((previous) => [...previous, { kind: 'person', text, purpose: 'work' }]);
    interpret.mutate(
      { text: context, lang: language },
      {
        onSuccess: (result) => {
          setTurns((previous) => [...previous, makeReply(result, region, language)]);
        },
        onError: (error) => {
          setTurns((previous) => [
            ...previous,
            { kind: 'reply', note: null, matches: [], error, region, language },
          ]);
        },
        onSettled: () => {
          sending.current = false;
        },
      },
    );
  };
  return (
    <JourneyFrame
      stage={
        selected ? 'tasks' : turns.some((turn) => turn.kind === 'reply') ? 'occupation' : 'work'
      }
    >
      <RexChat turns={turns} pending={interpret.isPending} onSend={send} onChoose={setSelected}>
        {selected && (
          <TaskChoice
            key={`${selected.occupation.code}-${selected.unitGroup?.isco08 ?? ''}`}
            match={selected}
            onBack={() => {
              setSelected(null);
            }}
          />
        )}
      </RexChat>
    </JourneyFrame>
  );
}

function makeContext(turns: readonly ChatTurn[], text: string): string {
  const history = turns
    .flatMap((turn) => (turn.kind === 'person' && turn.purpose !== 'social' ? [turn.text] : []))
    .join('\n');
  const latest = text.slice(0, 600);
  const available = Math.max(0, 599 - latest.length);
  const earlier = available > 0 ? history.slice(-available) : '';
  return [earlier, latest].filter(Boolean).join('\n');
}

function makeReply(result: InterpretResult, region: Region, language: 'en' | 'es'): ChatTurn {
  return {
    kind: 'reply',
    note: result.note,
    matches: result.matches,
    error: null,
    region,
    language,
  };
}
