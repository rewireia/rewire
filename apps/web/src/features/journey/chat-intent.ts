/** Only complete social messages bypass interpretation; mixed job descriptions stay intact. */
export type SocialIntent = 'greeting' | 'thanks' | 'help' | 'identity';

const GREETINGS =
  'hola|holi|buenas|buenos dias|buenas tardes|buenas noches|hello|hi|hey|good morning|good evening';
const GREETING_END = '(?: rex)?(?: que tal| como estas| how are you)?';

const SOCIAL_PATTERNS: readonly [SocialIntent, RegExp][] = [
  ['greeting', new RegExp(`^(?:${GREETINGS})${GREETING_END}$`, 'u')],
  ['thanks', /^(?:muchas gracias|gracias|thanks|thank you|thank you very much)(?: rex)?$/u],
  ['help', /^(?:ayuda|ayudame|me ayudas|puedes ayudarme|help|help me|can you help me)$/u],
  ['identity', /^(?:quien eres|que puedes hacer|who are you|what can you do)$/u],
];

export function socialIntent(text: string): SocialIntent | undefined {
  const normalized = text
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/gu, ' ')
    .trim();
  return SOCIAL_PATTERNS.find(([, pattern]) => pattern.test(normalized))?.[0];
}
