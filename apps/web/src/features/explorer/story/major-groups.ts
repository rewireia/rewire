import type { MessageKey } from '../../../i18n/en.ts';
import type { Messages } from '../../../i18n/use-messages.ts';

/** The names of the nine ISCO-08 major groups, in full and short, in the person's language. */
const NAMES: Readonly<Partial<Record<string, readonly [MessageKey, MessageKey]>>> = {
  '1': ['insights.major.1', 'insights.major.1.short'],
  '2': ['insights.major.2', 'insights.major.2.short'],
  '3': ['insights.major.3', 'insights.major.3.short'],
  '4': ['insights.major.4', 'insights.major.4.short'],
  '5': ['insights.major.5', 'insights.major.5.short'],
  '6': ['insights.major.6', 'insights.major.6.short'],
  '7': ['insights.major.7', 'insights.major.7.short'],
  '8': ['insights.major.8', 'insights.major.8.short'],
  '9': ['insights.major.9', 'insights.major.9.short'],
};

/** A major group's name; the title the server sent when the code is not one of the nine. */
export function majorGroupName(
  t: Messages['t'],
  group: { readonly code: string; readonly title: string },
  short = false,
): string {
  const keys = NAMES[group.code];
  return keys === undefined ? group.title : t(short ? keys[1] : keys[0]);
}
