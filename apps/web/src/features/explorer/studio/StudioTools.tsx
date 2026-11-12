import { Button } from '../../../components/Button.tsx';
import { Capsule } from '../../../components/Capsule.tsx';
import { useMessages } from '../../../i18n/use-messages.ts';

import { PAGE_IDS, type PageId } from './report.ts';
import styles from './Studio.module.css';
import type { useStudioControls } from './use-studio-controls.ts';

export type StudioMode = 'read' | 'design' | 'analyst';

interface StudioToolsProps {
  readonly mode: StudioMode;
  readonly onMode: (mode: StudioMode) => void;
  readonly analystOffered: boolean;
  readonly controls: ReturnType<typeof useStudioControls>;
  readonly onReset: () => void;
}

/** The pages, the analyst, "Edit layout" with undo and redo, and "Reset", above the dashboard. */
export function StudioTools({ mode, onMode, analystOffered, controls, onReset }: StudioToolsProps) {
  const { t } = useMessages();
  const editing = mode !== 'read';
  return (
    <div className={styles.tools}>
      <Capsule<PageId>
        legend={t('studio.page')}
        hideLegend
        value={controls.pageId}
        options={PAGE_IDS.map((id) => ({ value: id, label: t(`studio.page.${id}`) }))}
        onChange={controls.choosePage}
      />
      <div className={styles.actions}>
        {analystOffered && mode !== 'analyst' && (
          <Button
            primary
            onClick={() => {
              onMode('analyst');
            }}
          >
            {t('studio.ask')}
          </Button>
        )}
        <Button
          aria-pressed={editing}
          onClick={() => {
            onMode(editing ? 'read' : 'design');
          }}
        >
          {editing ? t('studio.done') : t('studio.edit')}
        </Button>
        {editing && (
          <>
            <Button disabled={!controls.history.canUndo} onClick={controls.undo}>
              {t('studio.undo')}
            </Button>
            <Button disabled={!controls.history.canRedo} onClick={controls.redo}>
              {t('studio.redo')}
            </Button>
          </>
        )}
        <Button onClick={onReset}>{t('studio.reset')}</Button>
      </div>
    </div>
  );
}
