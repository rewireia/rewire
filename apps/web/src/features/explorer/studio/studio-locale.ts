import type { AgStudioLocaleText } from 'ag-studio';

import type { Language } from '../../../app/preferences.ts';

/**
 * Studio's own texts in Spanish. AG Studio ships its interface in English only (about 1,140
 * texts, most of them in the editor); these are the ones a reader meets in reading mode: the
 * filters panel, the list filter and the tables. The editor stays in English.
 */
const SPANISH: AgStudioLocaleText = {
  panelTitleFilters: 'Filtros',
  filterSectionPage: 'Filtros de la página',
  filterSectionWidget: 'Filtros de la pieza',
  filterSummaryInactive: 'es (todos)',
  filterAddCard: 'Añadir filtro',
  filterPanelApply: 'Aplicar',
  filterPanelCancel: 'Cancelar',
  filterSetBlanks: '(Vacío)',
  filterWidgetFilterBy: 'Filtrar por: ${field}',
  listFilterWidgetSelectAll: 'Seleccionar todo',
  searchPlaceholder: 'Buscar…',
  searchClearAriaLabel: 'Borrar la búsqueda',
  gridWidgetTotalRow: 'Total',
  valueStringEmpty: '(Vacío)',
  widgetOverlayLoading: 'Cargando…',
};

/** The texts to pass to Studio; an empty set keeps its English. */
export function studioLocaleOf(language: Language): AgStudioLocaleText {
  return language === 'es' ? SPANISH : {};
}
