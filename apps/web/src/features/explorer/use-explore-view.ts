import { updatePreferences, usePreferences, type ExploreView } from '../../app/preferences.ts';
import { useMediaQuery } from '../../components/use-media-query.ts';

/**
 * The dashboard needs room: its canvas is 720 px at least, beside a filters panel. Below this
 * width only the table is offered, and AG Studio is never downloaded.
 */
const WIDE_ENOUGH = '(min-width: 1024px)';

/**
 * How the explorer shows the occupations: the view the person chose last, or by default the
 * dashboard on a wide screen. A narrower screen always shows the table.
 */
export function useExploreView() {
  const { exploreView } = usePreferences();
  const wide = useMediaQuery(WIDE_ENOUGH);
  const view: ExploreView = wide ? (exploreView ?? 'analyse') : 'table';
  const choose = (next: ExploreView) => {
    updatePreferences({ exploreView: next });
  };
  return { view, offerAnalyse: wide, choose };
}
