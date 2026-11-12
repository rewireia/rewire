import type { AgFilterDefinition, AgStudioApi } from 'ag-studio';
import { useCallback, useRef, useState } from 'react';

import { PAGE_IDS, type PageId } from './report.ts';

type StudioApi = AgStudioApi;

interface History {
  readonly canUndo: boolean;
  readonly canRedo: boolean;
}

/**
 * What the tools above the dashboard read and do through Studio's API: undo and redo, the page
 * shown and the drill-through filter. They follow every change of the report.
 */
export function useStudioControls() {
  const studio = useRef<StudioApi | null>(null);
  const [history, setHistory] = useState<History>({ canUndo: false, canRedo: false });
  const [pageId, setPageId] = useState<PageId>('overview');
  const [drill, setDrill] = useState<AgFilterDefinition | null>(null);

  const follow = useCallback((api: StudioApi) => {
    studio.current = api;
    const { undo, redo } = api.getHistory();
    setHistory({ canUndo: undo.length > 0, canRedo: redo.length > 0 });
    const selected = PAGE_IDS.find((id) => id === api.getState().selectedPageId);
    setPageId(selected ?? 'overview');
  }, []);

  const choosePage = (next: PageId) => {
    const api = studio.current;
    if (api !== null) {
      api.setState({ ...api.getState(), selectedPageId: next });
      // A change of page is a change of view: Studio does not report it as a change of the report.
      setPageId(next);
    }
  };

  return {
    history,
    pageId,
    drill,
    follow,
    choosePage,
    undo: () => studio.current?.undo(),
    redo: () => studio.current?.redo(),
    drillTo: setDrill,
    clearDrill: () => {
      setDrill(null);
    },
  };
}
