import type { StudioCatalogue } from './en-studio.ts';

/** Spanish messages of the explorer's "Analyse" view: the same keys as the English ones. */
export const studioEs: StudioCatalogue = {
  'explore.view': 'Ver las ocupaciones como',
  'explore.view.table': 'Tabla',
  'explore.view.analyse': 'Analizar',

  'studio.label': 'El índice de la OIT como panel',
  'studio.lede':
    'Pulsa una barra o un gran grupo para filtrar todas las cifras. Edita el diseño para mover, cambiar de tamaño o añadir piezas: se guarda en este navegador hasta que lo restableces.',
  'studio.edit': 'Editar diseño',
  'studio.done': 'Hecho',
  'studio.reset': 'Restablecer',
  'studio.status.saved': 'Tu diseño se guarda en este navegador.',
  'studio.status.reset': 'De vuelta al panel que trae {brand}.',

  'studio.table.occupations': 'Ocupaciones',
  'studio.table.occupations.description':
    'Los 427 grupos primarios de la CIUO-08 del índice de la OIT de exposición a la IA generativa (2025), uno por fila.',
  'studio.table.majorGroups': 'Grandes grupos',
  'studio.table.majorGroups.description':
    'Los grandes grupos de la CIUO-08 a los que pertenecen las ocupaciones.',
  'studio.field.exposure.description':
    'La nota media de las tareas de la ocupación, de 0 a 100, tal como la da la OIT.',
  'studio.field.highLevel': 'Nivel alto o muy alto',
  'studio.field.levelOrder': 'Orden del nivel',

  'studio.kpi.scored': 'Ocupaciones puntuadas',
  'studio.kpi.mean': 'Exposición media (0-100)',
  'studio.kpi.high': 'Con nivel alto o muy alto',
  'studio.kpi.tasks': 'Tareas puntuadas',
  'studio.widget.groups': 'Gran grupo',
  'studio.widget.byLevel': 'Ocupaciones por nivel',
  'studio.widget.byGroup': 'Exposición media por gran grupo',
  'studio.widget.most': 'Ocupaciones más expuestas',
  'studio.widget.least': 'Ocupaciones menos expuestas',
  'studio.widget.levelsByGroup': 'Niveles dentro de cada gran grupo',
  'studio.widget.groupTable': 'Ocupaciones por gran grupo y nivel',

  'studio.page': 'Página del panel',
  'studio.page.overview': 'Resumen',
  'studio.page.groups': 'Grupos y niveles',
  'studio.undo': 'Deshacer',
  'studio.redo': 'Rehacer',
  'studio.ask': 'Preguntar al analista',
  'studio.drill.showing': 'Detalle de: {what}.',
  'studio.drill.clear': 'Ver todo',
  'studio.menu.report': 'Abrir el informe de esta ocupación',
  'studio.menu.drill': 'Ver el detalle de esto',

  'studio.focus.label': 'Ocupación en foco',
  'studio.focus.one': 'La ocupación que elegiste',
  'studio.focus.top': 'La más expuesta de {count} ocupaciones',
  'studio.focus.none': 'Ninguna ocupación cumple estos filtros.',
  'studio.focus.open': 'Abrir el informe',
  'studio.focus.occupation': 'Código de la ocupación',
  'studio.focus.rankBy': 'Ordenada por',

  'studio.analyst.name': 'Analista de {brand}',
  'studio.analyst.starter.groups': '¿Qué grupos están más expuestos?',
  'studio.analyst.starter.groups.prompt':
    '¿Qué grandes grupos tienen la exposición media más alta? Añade un gráfico que lo muestre.',
  'studio.analyst.starter.why': '¿Por qué puntúan tan alto los grabadores de datos?',
  'studio.analyst.starter.why.prompt':
    '¿Por qué puntúan tan alto los Data Entry Clerks (4132)? Lee sus tareas y nombra las más expuestas.',
  'studio.analyst.starter.clerks': 'Céntrate en el trabajo administrativo',
  'studio.analyst.starter.clerks.prompt':
    'Filtra la página al personal de apoyo administrativo y dime qué cambia en las cifras clave.',
};
