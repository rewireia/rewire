import type { AgDefaultWidgetDefinition } from 'ag-studio';
import type { AgRegistry, AgWidgetDefinition } from 'ag-studio-react';

import type { FOCUS_WIDGET_TYPE, FocusWidget } from './focus/focus-widget.ts';

/** Studio's widgets and Rewire's own, so that a report can name "Occupation in focus". */
export interface RewireRegistry extends AgRegistry {
  widgets: readonly (
    AgDefaultWidgetDefinition | AgWidgetDefinition<typeof FOCUS_WIDGET_TYPE, FocusWidget>
  )[];
}
