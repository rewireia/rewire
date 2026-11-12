/**
 * A task as a sentence on screen. The ILO publishes some tasks as items of a list, ending in a
 * semicolon; on screen they end in a full stop. The data itself is not changed.
 */
export function taskText(text: string): string {
  const trimmed = text.trimEnd();
  return trimmed.endsWith(';') ? `${trimmed.slice(0, -1).trimEnd()}.` : trimmed;
}
