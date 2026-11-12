import { useMemo } from 'react';
import { useTaskTranslations } from '../api/queries.ts';
import { useMessages } from '../i18n/use-messages.ts';
import { taskText } from './task-text.ts';

/** One cached request per occupation; source text remains available on every translated task. */
export function useTranslatedTasks(isco08: string | null) {
  const { language } = useMessages();
  const query = useTaskTranslations(isco08, language);
  const translations = useMemo(
    () => new Map(query.data?.translations.map(({ id, text }) => [id, text]) ?? []),
    [query.data],
  );
  return {
    text: (task: { readonly id: string; readonly text: string }) =>
      taskText(translations.get(task.id) ?? task.text),
    original: (task: { readonly id: string; readonly text: string }) =>
      translations.has(task.id) ? taskText(task.text) : undefined,
    language: (task: { readonly id: string }) => (translations.has(task.id) ? 'es' : 'en'),
    status:
      language !== 'es' || isco08 === null
        ? null
        : query.isError
          ? 'error'
          : query.data
            ? 'ready'
            : 'loading',
  } as const;
}

export function TranslationNote({
  status,
}: {
  readonly status: ReturnType<typeof useTranslatedTasks>['status'];
}) {
  const { t } = useMessages();
  if (status === null) return null;
  return <p role="status">{t(`taskTranslation.${status}`)}</p>;
}
