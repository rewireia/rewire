import type { AgReportState, AgStudioApi } from 'ag-studio';
import { useMemo, useState } from 'react';

import { safeStorage } from '../../../app/storage.ts';
import { useMessages } from '../../../i18n/use-messages.ts';

import type { RewireRegistry } from './registry.ts';
import { defaultReport } from './report.ts';
import { clearReport, loadReport, saveReport } from './report-store.ts';

type Status = 'idle' | 'saved' | 'reset';

/**
 * The report Studio opens with: the layout this browser kept, or the shipped one. Every change is
 * kept as it happens; "Reset" forgets it and asks for a new Studio (a new `studioKey`), since Studio
 * reads its first state only once. Without storage the dashboard still works and is not kept.
 */
export function useSavedReport() {
  const { t, language } = useMessages();
  const storage = useMemo(() => safeStorage('localStorage'), []);
  const [status, setStatus] = useState<Status>('idle');
  const [generation, setGeneration] = useState(0);
  /** The report a newly opened Studio starts from, read when it opens. */
  const openReport = (): AgReportState<RewireRegistry> =>
    (storage === null ? null : loadReport(storage, language)) ?? defaultReport(t);
  const keep = (api: AgStudioApi) => {
    if (storage !== null && saveReport(storage, language, api.getState())) {
      setStatus('saved');
    }
  };
  const reset = () => {
    if (storage !== null) {
      clearReport(storage, language);
    }
    setGeneration((current) => current + 1);
    setStatus('reset');
  };
  return { openReport, studioKey: `${language}-${String(generation)}`, status, keep, reset };
}
