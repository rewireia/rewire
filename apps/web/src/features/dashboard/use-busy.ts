import { useCallback, useState } from 'react';

/** The ids of rows with an action on its way, so their buttons wait. */
export function useBusy() {
  const [busy, setBusy] = useState<ReadonlySet<string>>(new Set());
  // The same function on every render: the grid's context keeps the first one it is given.
  const run = useCallback((id: string, action: Promise<unknown>) => {
    setBusy((previous) => new Set(previous).add(id));
    const done = () => {
      setBusy((previous) => {
        const next = new Set(previous);
        next.delete(id);
        return next;
      });
    };
    // A failure is shown by the mutation that ran it; here it only ends the wait.
    void action.then(done, done);
  }, []);
  return { busy, run };
}
