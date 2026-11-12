import type { GetLocaleText, GetLocaleTextParams } from 'ag-grid-community';
import { useCallback, useEffect, useRef } from 'react';

import type { MessageKey } from '../i18n/en.ts';
import { useMessages, type Messages } from '../i18n/use-messages.ts';

/**
 * The texts AG Grid shows or announces with the modules Rewire registers, by AG Grid's key:
 * the sort hint of a header, the export overlay, the label of the select editor and the
 * pagination panel.
 */
const GRID_TEXTS: Readonly<Record<string, MessageKey>> = {
  ariaSortableColumn: 'grid.sortable',
  exportingOoo: 'grid.exporting',
  ariaLabelSelectField: 'grid.choices',
  page: 'grid.page',
  of: 'grid.of',
  to: 'grid.to',
  more: 'grid.more',
  pageSizeSelectorLabel: 'grid.pageSize',
  ariaPageSizeSelectorLabel: 'grid.pageSizeName',
  firstPage: 'grid.firstPage',
  previousPage: 'grid.previousPage',
  nextPage: 'grid.nextPage',
  lastPage: 'grid.lastPage',
};

/**
 * AG Grid's texts in the person's language. `none` is what an empty table says, with no rows
 * or with every row filtered out; a key Rewire does not show keeps AG Grid's own text.
 */
export function gridText(t: Messages['t'], none: MessageKey): GetLocaleText {
  return ({ key, defaultValue, variableValues = [] }: GetLocaleTextParams) => {
    if (key === 'noRowsToShow' || key === 'noMatchingRows') {
      return t(none);
    }
    if (key === 'ariaSortPriority') {
      const [priority = '', count = ''] = variableValues;
      return t('grid.sortPriority', { priority, count });
    }
    const own = GRID_TEXTS[key];
    return own === undefined ? defaultValue : t(own);
  };
}

/**
 * `getLocaleText` for a grid. AG Grid reads it only when the grid is created, so the callback
 * stays the same and asks for the current language each time a text is drawn.
 */
export function useGridText(none: MessageKey): GetLocaleText {
  const { t } = useMessages();
  const current = useRef(gridText(t, none));
  useEffect(() => {
    current.current = gridText(t, none);
  }, [t, none]);
  return useCallback((params: GetLocaleTextParams) => current.current(params), []);
}
