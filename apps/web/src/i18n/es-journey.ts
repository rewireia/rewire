import type { JourneyCatalogue } from './en-journey.ts';

/** Spanish messages of the journey: the same keys as the English ones. */
export const journeyEs: JourneyCatalogue = {
  'report.visual.tasksLabel': 'Tareas de la ocupación',
  'report.visual.selectorLabel': 'Mostrar reparto de',
  'report.visual.distributionCaption': 'Número de tareas en cada banda de exposición.',
  'report.visual.compareTitle': 'Tu semana y la ocupación',
  'report.visual.compareCaption':
    'Tu semana usa el peso de tus tareas. La media de la ocupación abarca el grupo completo. Puntuaciones sobre 100.',
  'report.visual.weekLabel': 'Tu semana',
  'report.visual.occupationLabel': 'Media de la ocupación',
  'report.visual.noWeek': 'Sin tiempo asignado',
  'report.visual.tasksTotal': 'Tareas oficiales',
  'report.visual.tasksYours': 'Tareas en tu semana',
  'report.visual.tasksReviewed': 'Tareas revisadas por expertos',
  'report.visual.tasksTitle': 'Las tareas con mayor exposición',
  'report.visual.tasksCaption':
    'Puntuación de exposición técnica sobre 100 para las tareas de esta ocupación.',

  'home.welcome.businessTitle': 'Tu formación, conectada.',
  'home.welcome.businessBody':
    'Gestiona tus cursos, define las reglas de tu agente y sigue cada compra.',
  'home.welcome.dashboard': 'Abrir mi panel',
  'home.entry.title': 'Tu acceso a la demo',
  'home.entry.learner': 'Entrando en la cuenta compartida del alumno.',
  'home.entry.business': 'Entrando en la cuenta del proveedor de cursos.',
  'home.entry.preparing': 'Preparando tu acceso a la demo…',
  'home.entry.note': 'Es una cuenta de demostración compartida.',
  'home.entry.success': 'Has iniciado sesión',
  'home.entry.failed': 'No hemos podido iniciar sesión.',
  'gate.eyebrow': 'Tu ubicación',
  'home.entry.retry': 'Volver a intentar el acceso',
  'home.welcome.eyebrow': '¡Bienvenido!',
  'home.welcome.title': 'Reconecta tus habilidades con Rewire.',
  'home.welcome.body':
    'Descubre cómo cambia la IA tu trabajo y encuentra formación para tu siguiente paso.',
  'home.welcome.start': 'Empezar',
  'home.region.facts':
    '{classification}, publicada por {publisher}: {occupations} ocupaciones y {titles} títulos de puesto, en {languages}.',
  'home.choice.eyebrow': 'Elige tu camino',
  'home.choice.title': 'El mundo está cambiando. Reconecta tus habilidades.',
  'home.choice.label': 'Elige cómo entrar',
  'home.choice.learner': 'Usuario',
  'home.choice.learnerBody': 'Explora tu trabajo y aprende lo que viene',
  'home.choice.business': 'Empresa',
  'home.choice.businessBody': 'Gestiona tu catálogo de formación y ventas',
  'report.preparing': 'Preparando tu informe de exposición, tarea por tarea',
  'report.profileLoading': 'Consultando el tiempo que asignaste a cada tarea',

  'report.plan.title': 'Con esta información, avancemos en tu formación',
  'report.plan.lede': 'Explora tu plan y pide al agente que encuentre formación para ti.',
  'report.plan': 'Pedir al agente formación a mi medida',
  'report.summary.caveat':
    'La exposición describe potencial técnico, no predice la pérdida de un empleo.',
  'report.table.label': 'Tarea a tarea, en una tabla',
  'report.table.bands': 'Bandas que se muestran',
  'report.table.none': 'Ninguna tarea cae en las bandas elegidas.',
  'report.table.col.task': 'Tarea',
  'report.table.col.score': 'Nota',
  'report.table.col.band': 'Banda',
  'report.table.col.range': 'Entre modelos',
  'report.table.col.reviewed': 'Revisión experta',
  'report.table.col.time': 'Tu tiempo',
  'report.table.reviewed': 'Revisada',
  'report.table.notReviewed': 'Sin revisar',
  'labour.title': 'Tu mercado laboral',
  'labour.noOccupation':
    'Abre este informe desde tu puesto para ver el empleo y el salario de tu ocupación en tu región.',
  'labour.scope.own': 'tu ocupación',
  'labour.scope.group':
    'el grupo más amplio «{group}», porque la fuente no publica nada más detallado',
  'labour.employment.label': 'Empleo',
  'labour.employment.people': 'Personas ocupadas en {scope}, {period}.',
  'labour.employment.jobs':
    'Empleos en {scope}, {period}. Cuenta empleos, no personas: quien tiene dos empleos cuenta dos veces.',
  'labour.employment.none':
    'No hay datos de empleo para esta ocupación en las fuentes utilizadas aquí.',
  'labour.pay.median-annual': 'Salario anual mediano',
  'labour.pay.mean-monthly': 'Ganancia media mensual',
  'labour.pay.median-annual.sentence':
    'El salario anual mediano de {scope}, {period}: la mitad gana más y la otra mitad, menos.',
  'labour.pay.mean-monthly.sentence':
    'La ganancia media mensual de {scope}, {period}. La media sube con los sueldos más altos, así que no se compara con una mediana.',
  'labour.pay.none': 'No hay datos salariales para esta ocupación en las fuentes utilizadas aquí.',
  'labour.population': 'A quién cuenta: {population}.',
  'explain.title': 'En palabras sencillas',
  'explain.lede': 'Rex puede contar este informe en unos párrafos, a partir de sus propias cifras.',
  'explain.button': 'Explicar mi informe',
  'explain.thinking': 'Rex está escribiendo',
  'explain.label': 'Escrito por un modelo de IA',
  'explain.task': 'tarea {number} · {score} de 100',
  'explain.note':
    'Escrito por un modelo de IA, solo con palabras: los números que lo acompañan son los del informe, puestos por {brand}. La exposición es potencial técnico: no es una predicción sobre el empleo de nadie.',

  'plan.eyebrow': 'Tu siguiente paso',
  'plan.continuity': 'De tu informe a tu formación',
  'plan.lede':
    'Responde unas preguntas. Rex buscará tres cursos de demostración para tus próximos pasos.',
  'plan.toReport': 'Volver al informe',
  'plan.focus.chartCaption':
    'Exposición de las tareas según la OIT, de 0 a 100. Es potencial técnico, no una predicción de pérdida de empleo.',
  'plan.focus.task': 'Tarea {number}',
  'plan.focus.label': 'De qué trata el plan',
  'plan.focus.most': 'Donde la IA puede hacer más',
  'plan.focus.mostLede':
    'Las tareas con la nota más alta de la OIT en esta ocupación: aprende a poner la IA a trabajar en ellas y a comprobar lo que hace.',
  'plan.focus.least': 'Donde la IA puede hacer menos',
  'plan.focus.leastLede': 'Las tareas con la nota más baja de la OIT en esta ocupación.',
  'stage.understand': 'Entender',
  'stage.apply': 'Aplicar',
  'stage.strengthen': 'Revisar y decidir',
  'stage.understand.body': 'Qué hace la IA generativa y dónde se equivoca.',
  'stage.apply.body': 'Usarla en las tareas de tu trabajo, con seguridad.',
  'stage.strengthen.body':
    'Revisar lo que produce la IA, decidir qué usar y responder del resultado.',
  'plan.opensElsewhere': '(abre la web del proveedor en otra pestaña)',
  'plan.payLater':
    'PayPal documenta {offers} para este importe. Que te lo ofrezca es decisión de PayPal al pagar.',
  'plan.payLater.offer': '{products} en {country}',
  'course.demo': 'Demo',
  'course.demoNote':
    'Este curso pertenece a un catálogo de demostración. Sus lecciones son reales, pero no es una titulación acreditada.',
  'course.hours': '{hours} h',
  'course.lessons': '{count} lecciones',
  'course.outcomes': 'Sabrás',
  'level.introductory': 'Inicial',
  'level.intermediate': 'Intermedio',
  'enrolment.none': 'Sin matrícula',
  'enrolment.payment-pending': 'Pago en revisión',
  'enrolment.active': 'Matriculado',
  'enrolment.completed': 'Terminado',
  'course.back': 'Volver a mi plan de formación',
  'course.toHome': 'Buscar tu ocupación',
  'course.factsTitle': 'Sobre el curso',
  'course.stage': 'Paso',
  'course.level': 'Nivel',
  'course.length': 'Duración',
  'course.enrolledTitle': 'Ya estás matriculado',
  'course.enrolledNote': 'Tus lecciones, la práctica y la prueba te esperan donde lo dejaste.',
  'course.continue': 'Seguir con el curso',
  'course.pendingNote': 'PayPal está revisando tu pago. El curso se abre en cuanto se confirme.',
  'course.payTitle': 'Pagar con PayPal',
  'course.priceNote': 'El precio lo fija el servidor de {brand}, en la moneda de tu región.',
  'course.refundNote':
    'Reembolso completo en los {days} días siguientes al pago, siempre que no hayas terminado el curso.',
  'course.browserNote':
    'Los cursos y el progreso pertenecen a la cuenta Demo compartida. Inicia sesión desde cualquier navegador para continuar.',
  'course.noPayments':
    'Este servidor no tiene credenciales de PayPal, así que aquí no se puede comprar nada.',
  'checkout.loading': 'Cargando PayPal',
  'checkout.failedToLoad':
    'No se ha podido cargar PayPal. Comprueba tu conexión y vuelve a intentarlo.',
  'checkout.notEligible': 'PayPal no puede cobrar este pago desde aquí.',
  'checkout.nothingCharged': 'No se cobra nada hasta que lo apruebes en PayPal.',
  'checkout.capturing': 'Confirmando tu pago con PayPal',
  'checkout.cancelled': 'Has cerrado PayPal antes de aprobar. No se ha cobrado nada.',
  'checkout.error':
    'PayPal no ha podido completar el pago. No se ha cobrado nada. Vuelve a intentarlo.',
  'checkout.outcome.completed': 'Pago recibido. Tu curso está abierto.',
  'checkout.outcome.held':
    'PayPal está revisando este pago. El curso se abre en cuanto se confirme.',
  'checkout.outcome.review':
    'PayPal ha respondido, pero {brand} aún no ha podido confirmar este pago. El curso queda reservado mientras se comprueba; tu panel muestra cómo va. No pagues otra vez.',
  'checkout.outcome.failed': 'El pago no se ha completado. No se ha cobrado nada.',
  'checkout.outcome.mismatch':
    'El pago no coincide con el pedido, así que el curso no se ha abierto. El dinero vuelve a tu cuenta de PayPal; tu panel muestra cuándo ha vuelto.',
  'checkout.outcome.not-approved':
    'PayPal aún no ha recibido tu aprobación. No se ha cobrado nada.',
  'checkout.outcome.refunded': 'Este pago se ha reembolsado.',
  'checkout.orderNumber': 'Número de pedido',
  'sponsor.title': 'Pedir a mi empresa que lo pague',
  'sponsor.lede':
    '{brand} envía a tu empresa una factura de PayPal por este curso. El curso se abre cuando la paga.',
  'sponsor.email': 'Correo de tu empresa',
  'sponsor.name': 'Nombre de la empresa (opcional)',
  'sponsor.submit': 'Enviar la factura',
  'sponsor.sending': 'Enviando',
  'sponsor.sent': 'La factura {number} va de camino a tu empresa.',
  'sponsor.statusLabel': 'Estado',
  'sponsor.status.sent': 'Enviada, sin pagar',
  'sponsor.status.paid': 'Pagada',
  'sponsor.status.review': 'Pago en revisión',
  'sponsor.status.cancelled': 'Cancelada',
  'sponsor.pay': 'Abrir la factura',

  'problem.payments_unavailable':
    'Este servidor no tiene credenciales de PayPal, así que aquí no se puede comprar nada.',
  'problem.already_enrolled': 'Ya estás matriculado en este curso. Síguelo desde tu panel.',
  'problem.payment_pending':
    'Ya hay un pago de este curso en revisión en PayPal. El curso se abre en cuanto se confirme.',
  'problem.payment_in_progress':
    'Ahora mismo se está completando otro pago de este curso. Espera unos minutos y vuelve a intentarlo: no se te cobrará dos veces.',
  'problem.payment_provider_error':
    'PayPal no ha podido completar la petición. No se ha cobrado nada. Vuelve a intentarlo en un momento.',
  'problem.refund_in_progress':
    'Ya se ha pedido el reembolso de este pago. PayPal lo está completando; vuelve a comprobarlo en unos minutos.',
  'problem.refund_not_allowed':
    'Este pago ya no se puede reembolsar: el curso está terminado o el plazo ha pasado.',
  'problem.no_session':
    'Este navegador aún no tiene sesión en {brand}. Confirma tu ocupación o empieza desde la página de un curso.',
  'problem.lessons_incomplete': 'Termina todas las lecciones del curso antes de hacer la prueba.',
  'problem.course_not_completed': 'Aprueba la prueba del curso para recibir su certificado.',
  'problem.guide_unavailable':
    'El modelo de IA no está configurado en este servidor. Todo lo demás funciona sin él.',
  'problem.guide_busy':
    'El modelo de IA está respondiendo a otras personas ahora mismo. Vuelve a intentarlo en un momento.',
  'problem.analyst_busy':
    'El analista sigue con tu última petición. Espera a que termine y vuelve a preguntar.',
  'problem.guide_budget_spent':
    'El modelo de IA ya ha respondido todo lo que puede hoy. Volverá mañana; el resto de {brand} funciona igual.',
  'problem.guide_refused':
    'El modelo de IA no ha podido responder a eso. Prueba a preguntarlo de otra forma.',
  'problem.guide_truncated': 'El modelo de IA no ha terminado su respuesta. Vuelve a preguntar.',
  'problem.explanation_failed_check':
    'Lo que escribió Rex no coincidía con las cifras de tu informe, así que no se muestra. El informe de arriba está completo sin ello.',
  'problem.invalid_input': 'Algo del formulario no es válido. Revísalo y vuelve a intentarlo.',
  'problem.not_found':
    '{brand} no encuentra lo que has pedido. Puede que se haya movido o que no exista.',
  'problem.invoice_pending':
    'Tu empresa tiene una factura abierta de este curso. Cancela esa petición en tu panel antes de pagar tú.',
  'problem.invoice_not_open':
    'Esta petición ya estaba pagada o cancelada, así que no hay nada que cancelar. La tabla muestra ahora cómo está.',
  'problem.invoice_unconfirmed':
    'PayPal aún no ha confirmado esta factura, así que por ahora no se puede cancelar. Vuelve a intentarlo en unos minutos.',
  'problem.certificate_unavailable':
    'Ahora mismo no se ha podido emitir el certificado. Tu curso está terminado: vuelve a intentarlo en un momento.',
  'problem.invalid_json':
    '{brand} no ha podido leer lo que ha enviado esta página. Recárgala y vuelve a intentarlo.',
  'problem.toDashboard': 'Ir a mi panel',
};
