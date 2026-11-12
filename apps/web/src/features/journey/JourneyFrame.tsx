import type { ReactNode } from 'react';
import { useMessages } from '../../i18n/use-messages.ts';
import styles from './Journey.module.css';

type JourneyStage = 'work' | 'occupation' | 'tasks' | 'report' | 'training';
const STAGES: readonly JourneyStage[] = ['work', 'occupation', 'tasks', 'report', 'training'];

/** A consistent, non-interactive orientation for the current step of the journey. */
export function JourneyFrame({
  stage,
  children,
}: {
  readonly stage: JourneyStage;
  readonly children: ReactNode;
}) {
  const { t } = useMessages();
  return (
    <div className={styles.frame} data-stage={stage}>
      <aside className={styles.sidebar} aria-label={t('conversation.progress')}>
        <p className={styles.sidebarTitle}>{t('conversation.progress')}</p>
        <ol className={styles.steps}>
          {STAGES.map((item, index) => (
            <li key={item} aria-current={item === stage ? 'step' : undefined}>
              <span className={styles.stepNumber}>{String(index + 1).padStart(2, '0')}</span>
              <span>{t(`conversation.stage.${item}`)}</span>
            </li>
          ))}
        </ol>
      </aside>
      <div className={styles.content}>{children}</div>
    </div>
  );
}
