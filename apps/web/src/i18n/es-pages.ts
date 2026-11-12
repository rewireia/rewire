import type { PagesCatalogue } from './en-pages.ts';

/** Spanish messages of the reading pages: the same keys as the English ones. */
export const pagesEs: PagesCatalogue = {
  'about.eyebrow': 'Qué es {brand}',
  'about.slogan': 'El trabajo cambia. Reconecta tus habilidades.',
  'about.lede':
    '{brand} muestra qué tareas de tu trabajo podría hacer la IA generativa, según la Organización Internacional del Trabajo, y lo convierte en un plan para aprender con cursos reales.',
  'about.who.title': 'Para quién es',
  'about.who.body':
    'Es para personas adultas que trabajan en la Unión Europea, Estados Unidos o el Reino Unido y quieren saber cómo afecta la IA generativa a su propio trabajo, sin leer artículos de investigación. Las empresas y los proveedores de cursos tienen su propio espacio.',
  'about.problem.title': 'Qué resuelve',
  'about.problem.body':
    'Casi todo lo que se dice sobre la IA y el empleo es alarma o promesa, y poco habla de tus propias tareas. {brand} parte de evidencia publicada: la OIT puntúa las tareas de cada ocupación, y {brand} muestra esas puntuaciones para las tareas que confirmas, ponderadas por tu propia semana. No predice que se vaya a perder un empleo; muestra dónde aprender ayudará antes.',
  'about.journey.title': 'El recorrido completo',
  'about.journey.1.title': 'Tu trabajo',
  'about.journey.1.body':
    'Describe lo que haces o escribe el nombre de tu puesto, y {brand} lo encuentra entre las ocupaciones oficiales de tu región.',
  'about.journey.2.title': 'Tus tareas',
  'about.journey.2.body':
    'Confirmas qué tareas de esa ocupación forman parte de tu trabajo y cuánto de tu semana ocupa cada una.',
  'about.journey.3.title': 'Tu informe de exposición',
  'about.journey.3.body':
    'Cada tarea lleva su puntuación de exposición de la OIT, y tu semana se pondera en una cifra que puedes leer tarea por tarea.',
  'about.journey.4.title': 'Tu plan',
  'about.journey.4.body':
    'A partir del informe, {brand} propone qué aprender primero: tres cursos reales que encajan con tus tareas y con tu tiempo semanal.',
  'about.journey.5.title': 'Cursos reales',
  'about.journey.5.body':
    'El catálogo recoge cursos reales de sus proveedores, cada uno con el enlace a su página. El precio que ves es un precio de sandbox de esta tienda; la inscripción real se hace en el proveedor.',
  'about.journey.6.title': 'Tu monedero y PayPal Sandbox',
  'about.journey.6.body':
    'Recargas tu monedero y pagas con PayPal Sandbox, que usa dinero de prueba: no se mueve dinero real. No se paga nada hasta que lo apruebas en PayPal, y ningún agente de IA puede aprobarlo por ti.',
  'about.journey.7.title': 'Aprende',
  'about.journey.7.body':
    'Tus cursos, tu progreso, tus pagos y tus devoluciones quedan juntos en tu panel, y el espacio de empresa muestra las ventas correspondientes.',

  'primer.eyebrow': 'Una guía para todo el mundo',
  'primer.title': '¿Qué es la IA y qué significa para tu trabajo?',
  'primer.lede':
    'Una guía sencilla sobre la IA generativa para quien acaba de leer su informe: cómo escribe, qué hace bien, dónde falla y cómo trabajar con ella.',
  'primer.minutes': 'Unos {minutes} minutos de lectura',
  'primer.contents': 'En esta página',

  'primer.what.title': 'Qué es la IA generativa',
  'primer.what.1':
    'La IA generativa es un programa que produce texto, imágenes, sonido o código nuevos en respuesta a una petición escrita en lenguaje corriente. Las herramientas que la mayoría encuentra en el trabajo, entre ellas los asistentes de chat, se basan en grandes modelos de lenguaje: programas entrenados con enormes colecciones de texto para continuar cualquier texto que se les dé.',
  'primer.what.2':
    'Son útiles porque manejan el lenguaje, y buena parte del trabajo se hace con lenguaje. Escribir un correo, resumir un informe, redactar un procedimiento o pasar unas notas a una tabla son tareas hechas de palabras, y un modelo de lenguaje puede intentar cada una en segundos.',
  'primer.what.3':
    'No son un buscador ni una enciclopedia. Entender esa diferencia es lo más útil que se puede aprender sobre ellos, porque explica a la vez lo que hacen bien y dónde se equivocan.',
  'primer.what.4':
    'Puedes encontrarte con la IA generativa sin haberla elegido. Redacta respuestas en los programas de correo, sugiere texto en los procesadores, resume reuniones en las videollamadas y contesta preguntas en las webs de tiendas, bancos y servicios públicos. Saber cómo funciona te ayuda a juzgar lo que produce allí donde aparezca, no solo en una ventana de chat.',

  'primer.how.title': 'Cómo escribe',
  'primer.how.1':
    'Un modelo de lenguaje escribe pieza a pieza. Lee tu petición, calcula qué fragmento de texto es más probable que venga a continuación, lo añade y repite hasta completar la respuesta. Esos fragmentos, llamados tokens, son palabras enteras o partes de palabras.',
  'primer.how.2':
    'El modelo aprendió qué es probable durante su entrenamiento, leyendo una cantidad enorme de texto y ajustándose hasta predecir bien cómo siguen los textos. Lo que conserva no es una lista de hechos sino patrones: qué palabras van juntas, cómo se suele construir un argumento, cómo suena una respuesta educada a una queja.',
  'primer.how.3':
    'Por eso puede escribir con soltura sobre casi cualquier cosa, y por eso la soltura no demuestra que algo sea verdad. Cuando responde a una pregunta, no busca la respuesta en una base de hechos comprobados: produce el texto que mejor encaja con el patrón de la pregunta. Algunas herramientas añaden una búsqueda en la web o leen los documentos que les das, lo que ayuda, pero la escritura sigue funcionando por predicción.',
  'primer.how.4':
    'Además, hay una parte de azar. En cada paso la herramienta no siempre toma la pieza más probable: a menudo elige entre varias probables, para que el texto suene natural. Por eso la misma petición puede dar una respuesta distinta cada vez, y por eso un modelo puede acertar en un intento y equivocarse en el siguiente.',
  'primer.diagram.title': 'Cómo escribe un modelo de lenguaje, pieza a pieza',
  'primer.diagram.request': 'Tu petición',
  'primer.diagram.prompt': 'Redacta una respuesta al',
  'primer.diagram.model': 'Modelo de lenguaje',
  'primer.diagram.patterns': 'patrones aprendidos del texto',
  'primer.diagram.candidates': 'Palabras probables',
  'primer.diagram.word1': 'cliente',
  'primer.diagram.word2': 'usuario',
  'primer.diagram.word3': 'correo',
  'primer.diagram.chosen': 'Se elige una y se añade',
  'primer.diagram.repeat': 'y el paso se repite',
  'primer.diagram.caption':
    'Una vista simplificada. El modelo sopesa las palabras que pueden venir después, una se añade al texto y el paso se repite hasta que la respuesta termina. La longitud de las barras es ilustrativa, no medida.',

  'primer.good.title': 'Qué hace bien',
  'primer.good.1':
    'La IA generativa rinde mejor en tareas en las que una primera versión rápida tiene valor y una persona puede comprobar el resultado: redactar y reformular textos, resumir documentos largos, traducir, proponer una estructura, explicar una idea con palabras más sencillas, escribir o revisar pequeños fragmentos de código y ordenar unas notas sueltas.',
  'primer.good.2':
    'También es paciente. Puedes hacerle la misma pregunta varias veces, con otras palabras, y no se cansa. Para quien aprende una materia nueva o prepara una conversación difícil, eso la convierte en una buena compañera de práctica.',
  'primer.good.3':
    'En todos estos casos el valor está en la rapidez de la primera versión. El juicio sobre si el resultado es correcto, adecuado y completo sigue siendo de la persona que la usa.',
  'primer.good.4':
    'Ayuda más cuando ya conoces el tema lo bastante para juzgar el resultado. Una administrativa de nóminas que pide el borrador de una carta sobre un cambio de salario ve enseguida si la carta está bien. Quien pregunta por una norma que nunca ha leído no puede verlo, y ahí es donde sus errores fluidos hacen más daño.',

  'primer.fails.title': 'Dónde falla',
  'primer.fails.1':
    'El fallo más conocido tiene nombre: alucinación. Un modelo alucina cuando produce un texto fluido, seguro y falso, como una fecha que nunca existió, una norma que no dice lo que afirma, una cita que nadie escribió o una referencia a un artículo, una sentencia o una página web que no existen. Como el modelo predice texto verosímil en lugar de recuperar hechos, una cita inventada puede parecer exactamente una real.',
  'primer.fails.2':
    'Los modelos también arrastran sesgos. Aprenden de textos escritos por personas, con los desequilibrios que contienen, y pueden repetir estereotipos sobre profesiones, géneros, edades u orígenes, o describir a un grupo de forma más favorable que a otro. Cuando un modelo ayuda a decidir sobre personas, por ejemplo al ordenar candidaturas, esos patrones importan.',
  'primer.fails.3':
    'Su conocimiento tiene fecha. Un modelo se entrena con textos reunidos hasta un momento dado, su fecha de corte, y no sabe nada de lo que vino después salvo que la herramienta añada una búsqueda. Puede presentar precios, normas o versiones de programas antiguos como si fueran actuales, y rara vez dirá que no lo sabe.',
  'primer.fails.4':
    'No son constantes. La misma pregunta hecha dos veces puede dar dos respuestas distintas, y un pequeño cambio de palabras puede cambiar la conclusión. Una respuesta es una entre muchas posibles, no una postura firme.',
  'primer.fails.5':
    'Por último, lo que escribes va a algún sitio. Una petición enviada a una herramienta de IA en línea se procesa en los servidores de su proveedor y, según el servicio y su configuración, puede guardarse o usarse para mejorar el modelo. Antes de pegar los datos de un cliente, los datos personales de una compañera o un documento confidencial, comprueba qué permite tu empresa y qué dicen las condiciones del proveedor.',
  'primer.fails.6':
    'Hay otro hábito que merece atención: los modelos tienden a dar la razón a quien pregunta. Si una pregunta ya sugiere una respuesta, es probable que el modelo la apoye, y si le discutes una respuesta correcta puede ceder. Hacer la misma pregunta de forma neutral, o pedirle que defienda la postura contraria, es una manera sencilla de comprobar lo firme que es una respuesta.',

  'primer.exposure.title': 'Qué significa «exposición» en {brand}',
  'primer.exposure.1':
    'Tu informe usa la palabra exposición en un sentido preciso. Procede de un índice publicado por la Organización Internacional del Trabajo, que puntúa las tareas de cada ocupación según cuánto de ellas podría realizar técnicamente la IA generativa. En su [documento de trabajo 140, de 2025](https://doi.org/10.54394/HETP0387), la OIT da a cada tarea una puntuación de 0 a 1, y puntúa las tareas de los 427 grupos de ocupaciones de la Clasificación Internacional Uniforme de Ocupaciones, CIUO-08.',
  'primer.exposure.2':
    'Una puntuación alta significa que la tecnología podría hacer buena parte de una tarea, no que un empleo vaya a desaparecer. Que una tarea cambie de verdad depende del coste, de la regulación, de cómo se organiza el trabajo y de las decisiones de empresas y trabajadores. {brand} lee la puntuación como potencial: un mapa de dónde podría cambiar antes tu trabajo y, por tanto, de dónde aprender ayudará antes.',
  'primer.exposure.3':
    '{brand} añade un paso propio. Indicas cuánto de tu semana ocupa cada tarea, y las puntuaciones de la OIT se promedian con esos pesos. El resultado es un cálculo de {brand}, no una cifra que publique la OIT, y no es una probabilidad: una semana que puntúa 61 sobre 100 no supone un riesgo del 61 % de nada.',
  'primer.exposure.4':
    'Cada puntuación de tu informe muestra también el rango entre los modelos que usó la OIT para obtenerla. Un rango amplio significa que no estuvieron de acuerdo sobre esa tarea; no es un margen de error, y es una buena razón para leer esa tarea con más cuidado. Tu informe muestra la fuente de cada puntuación, así que siempre puedes volver a la evidencia.',

  'primer.work.title': 'Cómo trabajar con ella',
  'primer.work.1':
    'Dale contexto. Un modelo solo sabe lo que hay en tu petición y en los documentos que compartes con él. Di para quién es el texto, qué debe conseguir, qué sabes ya y qué forma necesitas. Una petición como «resume este informe para una directora que tiene dos minutos, en cinco frases, y señala las cifras que debería comprobar» obtiene una respuesta mucho mejor que «resume esto».',
  'primer.work.2':
    'Comprueba lo que importa. Trata cada respuesta como el borrador de un ayudante rápido pero poco fiable. Contrasta nombres, cifras, fechas, citas y referencias con la fuente original antes de usarlos, y abre cada enlace que te dé. Si cita un documento, busca el documento.',
  'primer.work.3':
    'Decide tú. Sigues siendo responsable de lo que envías, firmas o publicas. Usa el modelo para ir más rápido en la primera versión, para ver opciones que no habías pensado o para practicar; guarda para ti el juicio sobre lo que es correcto, justo y adecuado para las personas implicadas.',
  'primer.work.4':
    'Usa las herramientas que permite tu organización. Muchas empresas eligen un servicio de IA configurado para que lo que escribe su personal no se use para entrenar al proveedor, y fijan normas sobre qué se puede compartir con él. Si todavía no hay normas, el hábito prudente es sencillo: deja fuera nombres, datos personales y todo lo confidencial, y dilo cuando un texto que entregas se haya redactado con IA.',

  'primer.next.title': 'Adónde ir después',
  'primer.next.1':
    'Si todavía no has confirmado tu ocupación, Empezar te guía y te da tu informe, tarea por tarea. La Biblioteca reúne informes y guías públicos sobre la IA y el trabajo de fuentes oficiales, cada uno con una nota sobre por qué puede interesarte. Cursos abre el catálogo, con cursos reales de sus proveedores.',
};
