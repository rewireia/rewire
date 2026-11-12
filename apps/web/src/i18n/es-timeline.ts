import type { TimelineCatalogue } from './en-timeline.ts';

/** Spanish messages of "Your plan in time": the same keys as the English ones. */
export const timelineEs: TimelineCatalogue = {
  'timeline.title': 'Tu plan en el tiempo',
  'timeline.dashboardTitle': 'Mi plan en el tiempo',
  'timeline.toPlan': 'Abrir el plan de aprendizaje',
  'timeline.view': 'Ver el plan como',
  'timeline.view.timeline': 'Cronograma',
  'timeline.view.list': 'Lista',
  'timeline.scale': 'Escala del gráfico',
  'timeline.scale.fit': 'Ajustar',
  'timeline.scale.weeks': 'Semanas',
  'timeline.scale.months': 'Meses',
  'timeline.lede':
    '{brand} coloca los cursos de este plan uno detrás de otro, a las horas que les dedicas cada semana.',
  'timeline.chartHint':
    'Arrastra un curso para empezarlo más tarde, estira uno cuya duración no se publica o desmarca «En el plan» para dejarlo fuera.',
  'timeline.pace': 'Horas a la semana',
  'timeline.paceOption': '{hours} h',
  'timeline.start': 'Inicio',
  'timeline.reset': 'Deshacer cambios',
  'timeline.resetHint':
    'Vuelve a poner todos los cursos en el plan, en su sitio y con su duración.',
  'timeline.saving': 'Guardando tu plan…',
  'timeline.saveFailed':
    'Tu último cambio no se guardó, así que el gráfico muestra el plan como estaba.',
  'timeline.chartLabel': 'Los cursos de tu plan en el tiempo',

  'timeline.summary.finishes': 'A {hours} horas por semana terminas el {date}.',
  'timeline.summary.empty':
    'Todos los cursos están fuera del plan, así que no tiene fecha de fin. Marca «En el plan» para recuperar uno.',
  'timeline.summary.known': 'Los cursos del plan publican {hours} horas en total.',
  'timeline.unbooked.one':
    'Un curso no publica su duración: {brand} le reserva {length} hasta que digas otra cosa.',
  'timeline.unbooked.other':
    '{count} cursos no publican su duración: {brand} reserva {length} a cada uno hasta que digas otra cosa.',
  'timeline.length.week': 'una semana',
  'timeline.length.days': '{days} días',

  'timeline.column.course': 'Curso',
  'timeline.column.hours': 'Horas',
  'timeline.column.inPlan': 'En el plan',
  'timeline.hours': '{hours} h',
  'timeline.noLength': 'Su proveedor no publica la duración.',
  'timeline.inPlanLabel': 'En el plan',

  'timeline.list.lede':
    'Desde aquí puedes mover cada curso, darle una duración o dejarlo fuera, también con el teclado. Si dejas vacío «No empezar antes del», el curso empieza cuando acaba el anterior.',
  'timeline.list.outOfPlan': 'Fuera del plan',
  'timeline.list.noLength': 'Duración no publicada',
  'timeline.list.notBefore': 'No empezar antes del',
  'timeline.list.notBeforeHint': 'Déjalo vacío para empezar cuando acabe el curso anterior.',
  'timeline.list.days': 'Días reservados',
  'timeline.list.fieldsOf': 'Tus elecciones para «{title}»',

  'timeline.payment.name': 'PayPal · {price}',
  'timeline.payment.due': 'Por pagar',
  'timeline.payment.held-by-paypal': 'Retenido por PayPal para revisión',
  'timeline.payment.invoice-sent': 'Factura enviada a tu empresa',
  'timeline.payment.paid': 'Pagado',
  'timeline.payment.paidOn': 'Pagado el {date}',
  'timeline.payment.refunded': 'Reembolsado',
  'timeline.payment.short.due': 'Por pagar',
  'timeline.payment.short.held-by-paypal': 'Retenido',
  'timeline.payment.short.invoice-sent': 'Factura enviada',
  'timeline.payment.short.paid': 'Pagado',
  'timeline.payment.short.refunded': 'Reembolsado',
  'timeline.payment.action.due': 'Pagarlo',
  'timeline.payment.action.held-by-paypal': 'Ver el pago',
  'timeline.payment.action.invoice-sent': 'Ver la solicitud',
  'timeline.payment.action.paid': 'Abrir el curso',
  'timeline.payment.action.refunded': 'Volver a pagarlo',
  'timeline.held.label': 'Esperando el pago',
  'timeline.held.waiting':
    'No puede empezar hasta que esté pagado: hasta entonces se retrasa un día cada día.',
  'timeline.held.startedWhenPaid': 'Empezó el día en que se pagó.',
  'timeline.summary.held.one':
    'Un curso espera su pago, así que el plan se retrasa un día cada día hasta que se pague.',
  'timeline.summary.held.other':
    '{count} cursos esperan su pago, así que el plan se retrasa un día cada día hasta que se paguen.',
  'timeline.finish': 'Aquí terminas',
  'timeline.stageDone': '{done} de {total} hechos',
  'timeline.today': 'Hoy',
  'timeline.ics.button': 'Añadir a mi calendario',
  'timeline.ics.file': 'plan-rewire.ics',
  'timeline.ics.note': 'Un curso de tu plan de aprendizaje de {brand}.',
  'timeline.guide.title':
    'Tu agente del plan: cuéntame qué ha cambiado y adaptaré tu hoja de ruta.',
  'timeline.guide.input': 'Cuéntale a Tempo qué ha cambiado',
  'timeline.guide.placeholder':
    'Por ejemplo: solo tengo dos horas a la semana y no puedo empezar hasta enero',
  'timeline.guide.ideas': 'Cambios que puedes pedirle a Tempo',
  'timeline.guide.off':
    'Tempo no está configurado en este servidor, así que el plan se cambia a mano aquí debajo.',
  'timeline.guide.hours': 'Solo tengo 2 horas a la semana',
  'timeline.guide.january': 'Empezar en enero',
  'timeline.guide.paid': 'Deja fuera los cursos de pago',

  'timeline.bar.demo': 'Demo',
  'timeline.bar.done': 'Hecho',

  'timeline.tip.dates': 'Del {start} al {end}',
  'timeline.tip.hours': '{hours} horas',
  'timeline.tip.noLength': 'Duración no publicada: puedes estirarlo.',
  'timeline.tip.moved': 'Lo moviste tú.',
  'timeline.tip.progress': '{percent} hecho',
  'timeline.tip.completed': 'Terminado',
  'timeline.tip.free': 'Gratuito, en la web del proveedor. {brand} no ve tu progreso allí.',
  'timeline.tip.paid': 'Curso de demostración de {brand}.',
};
