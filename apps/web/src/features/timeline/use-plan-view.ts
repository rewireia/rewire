import { updatePreferences, usePreferences, type PlanView } from '../../app/preferences.ts';
import { useMediaQuery } from '../../components/use-media-query.ts';

/** The chart needs room: on a narrower screen the plan is a list and the chart is not offered. */
const WIDE_ENOUGH = '(min-width: 720px)';

/**
 * How the plan in time is shown: the view the person chose last, or by default the timeline on
 * a wide screen. A narrow screen always shows the list, and never loads the chart.
 */
export function usePlanView() {
  const { planView } = usePreferences();
  const wide = useMediaQuery(WIDE_ENOUGH);
  const view: PlanView = wide ? (planView ?? 'timeline') : 'list';
  const choose = (next: PlanView) => {
    updatePreferences({ planView: next });
  };
  return { view, offerTimeline: wide, choose };
}
