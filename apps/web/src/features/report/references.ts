import type { ExposureTask } from '@rewire/contracts';

/**
 * A piece of an explanation: plain text, or a reference to a task of the report, which the page
 * draws with the task's own score. The model's words hold no figure.
 */
export type ExplanationPiece =
  | { readonly kind: 'text'; readonly text: string }
  | { readonly kind: 'task'; readonly number: number; readonly task: ExposureTask };

/** A task an explanation mentions, with its number in the report, most exposed first. */
export interface MentionedTask {
  readonly number: number;
  readonly task: ExposureTask;
}

const REFERENCE = /\[T(\d+)\]/g;

/**
 * Splits a paragraph at its task tags, such as `[T2]`: the second task of the report, most
 * exposed first. A tag that points at no task stays as text.
 */
export function splitReferences(
  paragraph: string,
  tasks: readonly ExposureTask[],
): readonly ExplanationPiece[] {
  const pieces: ExplanationPiece[] = [];
  let last = 0;
  for (const match of paragraph.matchAll(REFERENCE)) {
    const number = Number(match[1]);
    const task = tasks[number - 1];
    if (task === undefined) {
      continue;
    }
    if (match.index > last) {
      pieces.push({ kind: 'text', text: paragraph.slice(last, match.index) });
    }
    pieces.push({ kind: 'task', number, task });
    last = match.index + match[0].length;
  }
  if (last < paragraph.length) {
    pieces.push({ kind: 'text', text: paragraph.slice(last) });
  }
  return pieces;
}

/** The tasks the paragraphs mention, each once, in the order of the report. */
export function mentionedTasks(
  paragraphs: readonly string[],
  tasks: readonly ExposureTask[],
): readonly MentionedTask[] {
  const mentioned = new Map<number, ExposureTask>();
  for (const piece of paragraphs.flatMap((paragraph) => splitReferences(paragraph, tasks))) {
    if (piece.kind === 'task') {
      mentioned.set(piece.number, piece.task);
    }
  }
  return [...mentioned]
    .sort(([one], [other]) => one - other)
    .map(([number, task]) => ({ number, task }));
}

/** The id of a task's entry in the report, the target of its references. */
export function taskAnchor(taskId: string): string {
  return `task-${taskId}`;
}
