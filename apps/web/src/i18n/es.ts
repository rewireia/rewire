import { conversationEs } from './es-conversation.ts';
import { coursesEs } from './es-courses.ts';
import { offersEs } from './es-offers.ts';
import { marketplaceEs } from './es-marketplace.ts';
import { walletEs } from './es-wallet.ts';
import { businessEs } from './es-business.ts';
import type { BaseCatalogue, Catalogue } from './en.ts';
import { accountEs } from './es-account.ts';
import { journeyEs } from './es-journey.ts';
import { libraryEs } from './es-library.ts';
import { learnListedEs } from './es-learn-listed.ts';
import { courseSourcesEs } from './es-course-sources.ts';
import { creditsEs } from './es-credits.ts';
import { pagesEs } from './es-pages.ts';
import { insightsEs } from './es-insights.ts';
import { studioEs } from './es-studio.ts';
import { timelineEs } from './es-timeline.ts';

const base: BaseCatalogue = {
  'nav.label': 'Principal',
  'nav.skip': 'Saltar al contenido',
  'nav.home': 'Inicio',
  'nav.explore': 'Explorar',
  'nav.ai': 'Qué es la IA',
  'nav.rewire': 'Cómo funciona',
  'nav.library': 'Biblioteca',
  'nav.courses': 'Cursos',
  'nav.start': 'Empezar',
  'menu.open': 'Menú',
  'menu.title': 'Menú',
  'menu.close': 'Cerrar el menú',
  'region.short': 'Región',
  'language.label': 'Idioma',
  'theme.label': 'Tema',
  'theme.toDark': 'Tema oscuro',
  'theme.toLight': 'Tema claro',
  'theme.system': 'Auto',
  'theme.system.name': 'Automático, como el sistema',
  'theme.light': 'Claro',
  'theme.dark': 'Oscuro',
  'footer.sources': 'Créditos y fuentes',
  'footer.label': 'Sitio',
  'footer.copyright': '© {year} {brand}',
  'footer.privacy': 'Privacidad',
  'officialLanguage.note':
    'Los títulos de la clasificación se muestran tal como los publica su fuente.',

  'taskTranslation.loading': 'Cargando la traducción de las tareas con IA…',
  'taskTranslation.error':
    'No se ha podido traducir las tareas; se muestran los originales en inglés.',
  'taskTranslation.ready':
    'Tareas traducidas con IA. Consulta el original en inglés al situarte sobre cada tarea.',

  'region.eu': 'Unión Europea',
  'region.us': 'Estados Unidos',
  'region.uk': 'Reino Unido',
  'region.eu.classification': 'ESCO',
  'region.us.classification': 'O*NET',
  'region.uk.classification': 'SOC 2020',

  'loading.label': 'Cargando',
  'error.title': 'Algo ha fallado.',
  'error.retry': 'Volver a intentarlo',
  'error.network':
    '{brand} no ha podido llegar a su servidor. Revisa tu conexión y vuelve a intentarlo.',
  'error.invalidAnswer':
    'El servidor ha enviado una respuesta que {brand} no puede leer. Vuelve a intentarlo.',
  'notFound.title': 'Esta página no existe.',
  'notFound.body': 'Puede que la dirección esté mal escrita o que la página se haya movido.',
  'notFound.home': 'Ir al inicio',
  'routeError.title': 'Algo ha fallado al mostrar esta página.',
  'routeError.body':
    'Tus elecciones siguen guardadas en este navegador. Recarga la página o vuelve al inicio.',
  'routeError.reload': 'Recargar la página',

  'home.title': '¿Qué partes de tu trabajo puede hacer la IA?',
  'gate.title': 'Elige tu región',

  'confirm.title': '¿Es esta tu ocupación?',
  'confirm.code': 'Código {code}',
  'confirm.groupLabel': 'Se lee con el grupo internacional',
  'confirm.groupExplained':
    'La OIT puntúa las tareas de los 427 grupos de la Clasificación Internacional Uniforme de Ocupaciones (CIUO-08), que se usa en todo el mundo.',
  'basis.job-title': 'El índice oficial asigna este mismo puesto a este grupo internacional.',
  'basis.classification':
    'Esta ocupación pertenece a este grupo internacional en su propia clasificación.',
  'basis.exact-match': 'Una tabla de correspondencias oficial las relaciona como equivalentes.',
  'basis.close-match': 'Una tabla de correspondencias oficial las relaciona como muy próximas.',
  'basis.narrow-match':
    'Una tabla de correspondencias oficial las relaciona: el grupo internacional es más concreto.',
  'basis.broad-match':
    'Una tabla de correspondencias oficial las relaciona: el grupo internacional es más amplio.',
  'basis.title-majority':
    'La mayoría de los puestos de esta ocupación se asignan a este grupo internacional.',
  'confirm.tasks': '¿Se parece a tu trabajo?',
  'confirm.yes': 'Sí, ver mi informe',
  'confirm.alternatives': '¿Se acerca más a una de estas?',
  'confirm.unscored': 'El índice de la OIT todavía no tiene notas para esta ocupación.',
  'confirm.unscoredShort': 'Sin notas todavía',
  'confirm.noGroup': 'Esta ocupación no está relacionada con ningún grupo internacional.',
  'confirm.back': 'Buscar de nuevo',
  'confirm.notFound': '{brand} no ha podido volver a encontrar esta ocupación. Búscala otra vez.',
  'confirm.untitledGroup': 'Un grupo que el índice de la OIT deja fuera',
  'confirm.current': 'Se muestra ahora',

  'report.readThrough': 'Se lee con el grupo internacional {title} ({code}).',
  'report.groupOnly': 'Grupo internacional {code}',
  'report.week.label': 'Tu semana',
  'report.week.sentence':
    'Cálculo de {brand} con las notas de la OIT: la media de tus tareas, ponderada por el tiempo que dijiste que te ocupa cada una, de 0 a 100. Los modelos fueron de {low} a {high}.',
  'report.week.none': 'Ninguna tarea ocupa tu tiempo, así que no hay nada que ponderar.',
  'report.week.live': 'Tu semana tiene ahora una nota de {score}.',
  'report.level.label': 'Nivel',
  'report.standing.label': 'Posición',
  'report.standing.figure': '{rank} de {total}',
  'report.standing.sentence':
    'De las {total} ocupaciones que puntúa la OIT, {above} tienen una nota media mayor que esta.',
  'report.split.title': 'Exposición de un vistazo',
  'report.split.caption': 'Estimación según el peso de tus tareas, no horas medidas.',
  'report.split.item': '{band}: {points} de 100',
  'report.tasks.title': 'Tarea por tarea',
  'report.tasks.lede':
    'Tus respuestas guardadas, ordenadas por exposición. Para cambiarlas, vuelve a hacer el recorrido.',
  'time.most': 'Casi toda',
  'time.some': 'Una parte',
  'time.little': 'Poca',
  'time.none': 'Nada',
  'report.limits.potential':
    'La nota mide lo que la tecnología podría hacer con una tarea. No predice que un empleo vaya a perderse.',
  'report.limits.person': 'No te juzga ni a ti ni a tu trabajo: describe tareas, no personas.',
  'report.limits.range':
    'El rango entre modelos muestra cuánto discreparon. No es un intervalo de confianza.',

  'band.high': 'Alta',
  'band.medium': 'Media',
  'band.low': 'Baja',
  'band.very-low': 'Muy baja',
  'gradient.gradient-4': 'Muy alto',
  'gradient.gradient-3': 'Alto',
  'gradient.gradient-2': 'Medio',
  'gradient.gradient-1': 'Bajo, pero desigual',
  'gradient.minimal': 'Mínimo',
  'gradient.not-exposed': 'Sin exposición',
  'gradient.gradient-4.sentence':
    'Muchas tareas tienen notas altas, y de forma constante: es de las ocupaciones que la IA generativa podría cambiar más.',
  'gradient.gradient-3.sentence':
    'Varias tareas tienen notas altas: la exposición es clara, aunque no abarca todo el trabajo.',
  'gradient.gradient-2.sentence':
    'Algunas tareas tienen notas altas; el resto sigue dependiendo mucho de las personas.',
  'gradient.gradient-1.sentence':
    'La exposición es baja en conjunto, pero unas pocas tareas tienen notas altas.',
  'gradient.minimal.sentence':
    'Las tareas tienen notas bajas: la IA generativa toca poco de este trabajo.',
  'gradient.not-exposed.sentence':
    'La OIT no encuentra una exposición apreciable en las tareas de esta ocupación.',

  'explore.title': 'Explora los datos',
  'explore.lede':
    'La exposición a la IA generativa, región a región: cuánto del trabajo de cada región está expuesto, contado con sus propias estadísticas laborales. Después, explora tú los 427 grupos de ocupaciones.',
  'explore.filter': 'Filtrar por título o código',
  'explore.majorGroups': 'Grandes grupos',
  'explore.mine': 'Ir a mi ocupación',
  'explore.histogram.caption':
    'Cómo se reparten las notas medias de todas las ocupaciones, en tramos de 5 puntos sobre 100. La barra de tu ocupación va en el color de acento.',
  'explore.histogram.count': 'Ocupaciones',
  'explore.none': 'Ninguna ocupación cumple estos filtros.',
  'explore.count': 'Se muestran {shown} de {total} ocupaciones.',
  'explore.col.code': 'Código',
  'explore.col.title': 'Ocupación',
  'explore.col.majorGroup': 'Gran grupo',
  'explore.col.exposure': 'Exposición',
  'explore.col.level': 'Nivel',
  'explore.col.tasks': 'Tareas',

  'method.journey.demo':
    'Usa Rewire / DemoDemoDemo en cualquiera de los dos espacios. Los cursos que aloja {brand} son de demostración y PayPal Sandbox usa dinero de prueba. Los datos del comprador se muestran al pagar.',
  'method.steps.title': 'El método',
  'method.step.1.title': 'Reconocer el puesto',
  'method.step.1.body':
    'Tu puesto se busca entre los títulos oficiales de tu región: ESCO en la Unión Europea, O*NET en Estados Unidos y el índice de codificación SOC 2020 en el Reino Unido.',
  'method.step.2.title': 'Llevarlo al grupo internacional',
  'method.step.2.body':
    'Cada ocupación regional se relaciona con uno de los 427 grupos de la Clasificación Internacional Uniforme de Ocupaciones, mediante las tablas de correspondencias y los índices de codificación oficiales.',
  'method.step.3.title': 'Leer las notas por tarea de la OIT',
  'method.step.3.body':
    'Para cada tarea del grupo, el índice de la OIT da una nota de 0 a 1 de lo que podría hacer la IA generativa, con el rango entre los modelos que usó.',
  'method.step.4.title': 'Ajustarlo a tu semana',
  'method.step.4.body':
    'Dices cuánto de tu semana ocupa cada tarea: la mayor parte, algo, poco o nada, que cuentan 3, 2, 1 y 0. Las notas de la OIT se promedian con esos pesos. El resultado es un cálculo propio de {brand}, no una cifra que publique la OIT, y no es una probabilidad de nada: 61 sobre 100 no significa un 61 % de riesgo.',
  'method.step.5.title': 'Ordenar',
  'method.step.5.body':
    'Las tareas se ordenan de más a menos expuestas, y la ocupación se sitúa entre todas las que puntúa la OIT.',
  'method.limits.title': 'Límites',
  'method.limits.translation':
    'Una ocupación regional y su grupo internacional no siempre son el mismo trabajo: la relación es oficial, pero puede ser amplia.',
  'method.photo.title': 'Fotografía de portada',
  'method.photo.credit':
    'Fotografía de portada: la Vía Láctea sobre el Observatorio Paranal, de ESO/H.H. Heyer, CC BY 4.0, recortada y redimensionada.',
  'method.photo.page': 'El original en Wikimedia Commons',
  'method.photo.licence': 'La licencia CC BY 4.0',
  'method.source.publisher': 'Editor',
  'method.source.version': 'Versión',
  'method.source.licence': 'Licencia',
  'method.source.retrieved': 'Consultada el',
  'method.source.attribution': 'Atribución',
  'method.source.adaptation': 'Aviso de adaptación',
  'method.privacy.title': 'Privacidad',
  'method.privacy.body':
    '{brand} guarda lo mínimo posible. El puesto que buscas no se guarda. Tus elecciones de idioma y tema se quedan en este navegador.',
  'method.privacy.keptTitle': 'Qué se guarda',
  'method.privacy.kept':
    'Una cookie de sesión identifica tu visita. Tras entrar en Demo, la ocupación, la región, los tiempos de las tareas, el presupuesto, los cursos, los pagos y el nombre del certificado pertenecen a una única cuenta de demostración guardada en el servidor. Otras personas que entren en Demo pueden ver y cambiar esa cuenta. Utiliza datos ficticios.',
  'method.privacy.notKeptTitle': 'Qué no se guarda',
  'method.privacy.notKept':
    '{brand} no guarda lo que escribes para describir tu trabajo, a Rex o a Tempo.',
  'method.privacy.guide.openai':
    'Lo que escribes a Rex o a Tempo se envía a un modelo de OpenAI, que lo responde.',
  'method.privacy.guide.other':
    'Lo que escribes a Rex o a Tempo se envía a un modelo de IA externo a {brand}, que lo responde.',
};

/** The Spanish catalogue: the same keys as the English one. */
export const es: Catalogue = {
  ...base,
  ...journeyEs,
  ...timelineEs,
  ...studioEs,
  ...insightsEs,
  ...accountEs,
  ...marketplaceEs,
  ...walletEs,
  ...businessEs,
  ...conversationEs,
  ...coursesEs,
  ...offersEs,
  ...pagesEs,
  ...libraryEs,
  ...learnListedEs,
  ...courseSourcesEs,
  ...creditsEs,
};
