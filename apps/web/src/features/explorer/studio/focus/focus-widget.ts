import type { AgWidgetData, AgWidgetDataFormat, AgWidgetFieldReference } from 'ag-studio';
import type { AgWidgetDefinition } from 'ag-studio-react';

import { MARK_FACES, MARK_VIEWBOX } from '../../../../components/brand-mark.ts';
import type { Messages } from '../../../../i18n/use-messages.ts';

import { OccupationFocus } from './OccupationFocus.tsx';

export const FOCUS_WIDGET_TYPE = 'occupation-focus';

interface FocusDataMapping {
  /** The field that names an occupation: its ISCO-08 code. */
  readonly occupation: AgWidgetFieldReference[];
  /** The figure the occupations are ranked by when several are left. */
  readonly rankBy?: AgWidgetFieldReference[];
}

/** The state of an "Occupation in focus" widget in a report. */
export interface FocusWidget extends AgWidgetData<FocusDataMapping, AgWidgetDataFormat<unknown>> {
  readonly type: typeof FOCUS_WIDGET_TYPE;
}

/** The same folded triangle as the header, sized by Studio's widget palette. */
const ICON =
  `<svg viewBox="${MARK_VIEWBOX}" xmlns="http://www.w3.org/2000/svg">` +
  MARK_FACES.map((face) => `<path d="${face.path}" fill="${face.colour}"/>`).join('') +
  '</svg>';

/**
 * "Occupation in focus", a widget of Rewire's own: the tasks of one occupation with their scores,
 * drawn as the report draws them, and the way to its report. It follows the dashboard's filters:
 * clicking an occupation in a table brings it into focus.
 */
export function focusWidgetOf(
  t: Messages['t'],
): AgWidgetDefinition<typeof FOCUS_WIDGET_TYPE, FocusWidget> {
  return {
    id: FOCUS_WIDGET_TYPE,
    label: t('studio.focus.label'),
    icon: ICON,
    dataMapping: {
      occupation: {
        type: 'field',
        supportedRoles: ['category'],
        required: true,
        aiDescription: 'The ISCO-08 code of the occupations: occupations.isco08.',
      },
      rankBy: {
        type: 'field',
        supportedRoles: ['numeric'],
        aiDescription: 'Ranks the occupations when several are left; the first is shown.',
      },
    },
    form: (params) =>
      params.createDefaults({
        dataMappingItems: [
          { key: 'occupation', label: t('studio.focus.occupation') },
          { key: 'rankBy', label: t('studio.focus.rankBy') },
        ],
      }),
    comp: OccupationFocus,
    defaultSize: { width: 420, height: 380 },
    minSize: { width: 280, height: 260 },
    ai: {
      label: t('studio.focus.label'),
      description: 'The tasks of one occupation with their ILO scores, and a link to its report.',
      usage: 'Use it to explain why an occupation scores as it does. Map occupations.isco08.',
    },
  };
}
