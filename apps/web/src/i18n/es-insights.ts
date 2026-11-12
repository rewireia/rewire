import type { insightsEn } from './en-insights.ts';

/** Textos en castellano de la historia en datos de una región, arriba de la página Explorar. */
export const insightsEs: Record<keyof typeof insightsEn, string> = {
  'insights.regions': 'Región de los datos',
  'insights.eyebrow': '01 / La región en datos',
  'insights.title.eu': 'La Unión Europea en datos',
  'insights.title.us': 'Estados Unidos en datos',
  'insights.title.uk': 'El Reino Unido en datos',
  'insights.lede':
    'Lo que el índice de la OIT de exposición a la IA generativa dice del trabajo de esta región, ponderado por cuántas personas hacen cada trabajo. La exposición es el potencial técnico de las tareas, no una previsión de pérdida de empleo.',

  'insights.counts.people': 'las personas ocupadas',
  'insights.counts.jobs': 'los empleos',
  'insights.figure.mean.label': 'Exposición del trabajador medio',
  'insights.figure.mean.body':
    'La puntuación media de las tareas de las ocupaciones, sobre 100, ponderada por {counts} de cada una.',
  'insights.figure.medium.label': 'En ocupaciones de 50 o más',
  'insights.figure.medium.body':
    'Parte de {counts} en ocupaciones cuya puntuación media de tareas es de 50 sobre 100 o más.',
  'insights.figure.medium.noHigh': 'Ninguna ocupación llega de media a 75.',
  'insights.figure.counted.label.people': 'Personas ocupadas contadas',
  'insights.figure.counted.label.jobs': 'Empleos contados',
  'insights.figure.counted.body':
    '{matched} de {total} están en una ocupación que puntúa la OIT; los porcentajes de esta página se refieren a ellas.',

  'insights.level.isco-2-digit':
    'Publicado por subgrupo principal de la CIUO-08 (dos dígitos): cada subgrupo se lee con la puntuación media de las ocupaciones que contiene.',
  'insights.level.isco-1-digit':
    'Publicado por gran grupo de la CIUO-08 (un dígito): cada punto es un gran grupo entero.',
  'insights.level.regional-occupation':
    'Publicado para cada ocupación de la clasificación de la región, leída a través del grupo de la CIUO-08 al que está enlazada.',

  'insights.bands.title':
    'El {share} de {counts} está en ocupaciones de exposición baja o muy baja',
  'insights.bands.caption':
    'Parte de {counts} según la banda de la puntuación media de tareas de su ocupación, sobre 100: muy baja por debajo de 25, baja desde 25, media desde 50 y alta desde 75.',
  'insights.bands.axis': 'Parte de {counts} (%)',
  'insights.bands.row': '{band}: {share} ({employed}, {groups} grupos)',

  'insights.groups.title': 'El gran grupo más expuesto es {group}, con {points} sobre 100',
  'insights.groups.caption':
    'Puntuación media de tareas de las ocupaciones de cada gran grupo de la CIUO-08, sobre 100. Es el propio índice de la OIT, igual en todas las regiones.',
  'insights.groups.axis': 'Puntuación media de tareas (0–100)',
  'insights.groups.row': '{group}: {points} sobre 100',

  'insights.major.1': 'Directores y gerentes',
  'insights.major.1.short': 'Directores',
  'insights.major.2': 'Profesionales científicos e intelectuales',
  'insights.major.2.short': 'Profesionales',
  'insights.major.3': 'Técnicos y profesionales de nivel medio',
  'insights.major.3.short': 'Técnicos',
  'insights.major.4': 'Personal de apoyo administrativo',
  'insights.major.4.short': 'Apoyo administrativo',
  'insights.major.5': 'Trabajadores de los servicios y vendedores de comercios y mercados',
  'insights.major.5.short': 'Servicios y ventas',
  'insights.major.6':
    'Agricultores y trabajadores calificados agropecuarios, forestales y pesqueros',
  'insights.major.6.short': 'Agropecuarios',
  'insights.major.7': 'Oficiales, operarios y artesanos de artes mecánicas y de otros oficios',
  'insights.major.7.short': 'Oficios y artesanía',
  'insights.major.8': 'Operadores de instalaciones y máquinas y ensambladores',
  'insights.major.8.short': 'Operadores',
  'insights.major.9': 'Ocupaciones elementales',
  'insights.major.9.short': 'Elementales',

  'insights.grid.title': 'En qué trabaja la región y cuán expuesto está ese trabajo',
  'insights.grid.caption':
    'Cada gran grupo con su puntuación media y su parte de {counts} de la región. Una ocupación enlazada a grupos de distintos grandes grupos queda fuera de estos porcentajes.',
  'insights.grid.label': 'Grandes grupos, su exposición y su parte del empleo',
  'insights.grid.col.group': 'Gran grupo',
  'insights.grid.col.exposure': 'Exposición',
  'insights.grid.col.employed': 'Parte del empleo',
  'insights.grid.col.share': 'Parte',
  'insights.grid.col.score': 'Nota',
  'insights.grid.notPublished': 'Sin desglose',

  'insights.pay.title.higher': 'Las ocupaciones mejor pagadas puntúan más alto',
  'insights.pay.title.lower': 'Las ocupaciones mejor pagadas puntúan más bajo',
  'insights.pay.title.equal': 'Salario y exposición no van de la mano',
  'insights.pay.body':
    'Por encima del salario mediano de {median}, la puntuación media es {above} sobre 100; en él o por debajo, {below}.',
  'insights.pay.measure.median-annual': 'salario anual mediano',
  'insights.pay.measure.mean-monthly': 'ganancia mensual media',
  'insights.pay.caption':
    'Cada punto es una ocupación o un grupo: su {measure} y su puntuación media de tareas.',
  'insights.pay.axis.score': 'Puntuación media de tareas (0–100)',
  'insights.pay.axis.pay': 'Salario ({currency})',
  'insights.pay.axis.payLog': 'Salario ({currency}, escala logarítmica)',

  'insights.extremes.title': 'Los extremos del índice',
  'insights.extremes.most': 'Ocupaciones más expuestas',
  'insights.extremes.least': 'Ocupaciones menos expuestas',
  'insights.extremes.caption':
    'Grupos primarios de la CIUO-08 del índice de la OIT, iguales en todas partes. Puntuación media de tareas sobre 100.',

  'insights.yourself.eyebrow': '02 / Explóralo tú',
  'insights.yourself.title': 'Explóralo tú',
  'insights.yourself.lede':
    'Los 427 grupos de ocupaciones del índice de la OIT: filtra, ordena y abre cualquier informe, o analízalos en un panel.',
};
