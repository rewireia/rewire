import type { GuideModel } from './model.ts';

/** Words a model marked as strong, the Markdown way: `**so**` or `__so__`. */
const STRONG = /(\*\*|__)(?=\S)(.+?)(?<=\S)\1/g;

/**
 * The words of a model as the page prints them. The page shows plain text, so the marks a
 * model adds out of habit to stress a word would show as asterisks: the marks are removed
 * and the words kept. A lone asterisk, as in "O*NET", is left alone.
 */
export function plainText(text: string): string {
  return text.replace(STRONG, '$2');
}

/** A model whose every answer is plain text. */
export function speakingPlainly(model: GuideModel): GuideModel {
  return {
    async complete(request) {
      const completion = await model.complete(request);
      return { ...completion, text: plainText(completion.text) };
    },
  };
}
