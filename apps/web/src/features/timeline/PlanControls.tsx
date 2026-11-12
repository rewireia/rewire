import type { StudyPlan } from '@rewire/contracts';
import { useEffect, useId, useState } from 'react';

import { Button } from '../../components/Button.tsx';
import { Capsule } from '../../components/Capsule.tsx';
import { useDebouncedValue } from '../../components/use-debounced-value.ts';
import { useMessages } from '../../i18n/use-messages.ts';

import {
  hasChanges,
  isPlanDay,
  paceOptions,
  PLAN_DAYS,
  reset,
  withPace,
  withStart,
} from './plan-changes.ts';
import styles from './Timeline.module.css';

/** A date typed by hand is saved once it has stopped changing for a moment. */
const TYPING_PAUSE_MS = 600;

interface PlanControlsProps {
  readonly plan: StudyPlan;
  readonly busy: boolean;
  /** Each answer of the server; the day field starts again from the plan it saved. */
  readonly revision: number;
  readonly onChange: (plan: StudyPlan) => void;
}

/** The pace and the first day of the plan, and the way back to the plan Rewire lays out. */
export function PlanControls({ plan, busy, revision, onChange }: PlanControlsProps) {
  const { t } = useMessages();
  const resetHint = useId();
  const options = paceOptions(plan.hoursPerWeek).map((hours) => ({
    value: String(hours),
    label: t('timeline.paceOption', { hours }),
  }));
  return (
    <div className={styles.controls}>
      <Capsule
        legend={t('timeline.pace')}
        options={options}
        value={String(plan.hoursPerWeek)}
        onChange={(value) => {
          onChange(withPace(plan, Number(value)));
        }}
      />
      <StartField key={`${plan.startsOn}-${revision}`} plan={plan} onChange={onChange} />
      {hasChanges(plan) && (
        <div className={styles.reset}>
          <Button
            disabled={busy}
            aria-describedby={resetHint}
            onClick={() => {
              onChange(reset(plan));
            }}
          >
            {t('timeline.reset')}
          </Button>
          <span id={resetHint} className={styles.detail}>
            {t('timeline.resetHint')}
          </span>
        </div>
      )}
    </div>
  );
}

/** The first day of the plan; a day typed by hand is saved once it is whole and valid. */
function StartField({ plan, onChange }: Pick<PlanControlsProps, 'plan' | 'onChange'>) {
  const { t } = useMessages();
  const id = useId();
  const [draft, setDraft] = useState(plan.startsOn);
  const settled = useDebouncedValue(draft, TYPING_PAUSE_MS);
  // The field starts again from the saved plan after every answer, so a refused day is not
  // sent twice.
  useEffect(() => {
    if (settled !== plan.startsOn && isPlanDay(settled)) {
      onChange(withStart(plan, settled));
    }
  }, [settled, plan, onChange]);
  return (
    <div className={styles.field}>
      <label htmlFor={id} className={styles.label}>
        {t('timeline.start')}
      </label>
      <input
        id={id}
        className={styles.date}
        type="date"
        min={PLAN_DAYS.first}
        max={PLAN_DAYS.last}
        value={draft}
        onChange={(event) => {
          setDraft(event.target.value);
        }}
      />
    </div>
  );
}
