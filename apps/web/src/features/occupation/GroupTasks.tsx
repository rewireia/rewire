import { useReport } from '../../api/queries.ts';
import { QueryState } from '../../components/QueryState.tsx';
import { useTranslatedTasks, TranslationNote } from '../../components/task-translations.tsx';

import styles from './ConfirmPage.module.css';

/** The tasks of an international group, without their scores yet. */
export function GroupTasks({ isco08 }: { readonly isco08: string }) {
  const report = useReport(isco08);
  const translated = useTranslatedTasks(isco08);
  return (
    <QueryState query={report}>
      {({ tasks }) => (
        <>
          <TranslationNote status={translated.status} />
          <ul className={styles.tasks}>
            {tasks.map((task) => (
              <li key={task.id} lang={translated.language(task)} title={translated.original(task)}>
                {translated.text(task)}
              </li>
            ))}
          </ul>
        </>
      )}
    </QueryState>
  );
}
