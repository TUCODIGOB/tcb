import Stripe from 'stripe';
import { compraValida, MAX_INTENTOS, estado, reservar, liberar } from '../lib/reserva.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Separador entre las 7 areas del informe. Tiene que ser algo que el modelo
// no pueda escribir nunca; ver la nota donde se usa.
const SEPARADOR_AREAS = '\u001F';

// EL RELOJ DE LA PETICION.
//
// Vercel corta esta funcion a los 300 segundos y devuelve un 504: el cliente ve
// "no hemos podido terminar tu estudio" y se queda sin informe habiendo pagado.
//
// Ninguna llamada llevaba tope de tiempo. Una que se quedaba colgada -en el
// informe 116 una estuvo 189 segundos sin contestar- no fallaba nunca, asi que
// el reintento tampoco llegaba a saltar: se comia el presupuesto entero y la
// funcion moria con el informe a medias.
//
// El reloj arranca al entrar la peticion y hace dos cosas:
//   - le pone tope a cada llamada, y nunca mas de lo que quede de presupuesto,
//     para que una colgada se corte sola y entre el reintento;
//   - deja saltarse los pasos que solo pulen (reescribir un rasgo que nombra la
//     carta, rellenar un area corta) cuando ya no queda tiempo para ellos y
//     para las siete areas. Vale mas el informe entero que un rasgo mejor.
//
// No añade ni una llamada: las quita cuando el tiempo aprieta.
const TOPE_DE_LA_PETICION = 285000; // 15 segundos por debajo del corte de Vercel

function crearReloj(margen = TOPE_DE_LA_PETICION) {
  const fin = Date.now() + margen;
  return {
    quedan: () => fin - Date.now(),
    // El tope de una llamada: el suyo, o lo que quede si queda menos.
    senal: tope => AbortSignal.timeout(Math.max(1000, Math.min(tope, fin - Date.now()))),
    // Un paso opcional solo se pide si caben sus segundos y los que vienen detras.
    hayTiempoPara: segundos => (fin - Date.now()) > segundos * 1000,
  };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // El reloj empieza aqui, con la peticion, no cuando se llama al modelo.
  const reloj = crearReloj();

  const { session_id } = req.body;

  if (!session_id || typeof session_id !== 'string') {
    return res.status(403).json({ error: 'Pago no verificado. No se puede generar el informe.' });
  }

  // Este endpoint es el unico que cuesta dinero (7 llamadas al modelo por
  // peticion), asi que aqui es donde se decide si se genera o no. Las tres
  // puertas van en este orden a proposito: primero lo definitivo, luego lo
  // temporal, y el contador de intentos el ultimo, para que una recarga
  // mientras se genera no consuma intentos ni dispare avisos en falso.
  let reserva;
  try {
    const session = await stripe.checkout.sessions.retrieve(session_id);
    if (!compraValida(session)) {
      return res.status(403).json({ error: 'Pago no verificado. No se puede generar el informe.' });
    }

    const st = estado(session);

    // 1. Ya se genero: definitivo. Ni recargando, ni con el enlace, ni nunca.
    if (st.completado) {
      return res.status(403).json({ error: 'Este informe ya fue generado.', motivo: 'completado' });
    }

    // 2. Se esta generando ahora mismo. No es un error: el informe viene en
    //    camino y llegara por correo. Sin gasto.
    if (st.ocupada) {
      return res.status(409).json({ error: 'Tu informe se esta generando ahora mismo.', motivo: 'en_curso' });
    }

    // 3. Se agotaron los intentos de verdad (los dos fallaron y liberaron la
    //    reserva, o caducaron). Aqui si hay que avisar al admin.
    if (st.intentos >= MAX_INTENTOS) {
      if (session.metadata?.aviso_agotado !== 'si') {
        try {
          const m = session.metadata || {};
          const emailCliente = session.customer_email || session.customer_details?.email || '(desconocido)';
          await enviarEmailAdmin({
            asunto: `⚠️ URGENTE — Cliente sin informe tras ${MAX_INTENTOS} intentos — ${m.nombre || 'Cliente'}`,
            mensaje: [
              `Este cliente HA PAGADO y NO tiene su informe. Hay que generarselo a mano.`,
              ``,
              `Email:    ${emailCliente}`,
              `Nombre:   ${m.nombre || '-'}`,
              `Telefono: ${m.telefono || '-'}`,
              `Sexo:     ${m.sexo || '-'}`,
              `Nacio:    ${m.fecha || '-'} a las ${m.hora || '-'}`,
              `Lugar:    ${[m.municipio, m.provincia, m.pais].filter(Boolean).join(', ') || '-'}`,
              `Edad:     ${m.edad || '-'}`,
              ``,
              `Session:  ${session_id}`,
              `Intentos: ${st.intentos} de ${MAX_INTENTOS}`,
            ].join('\n'),
          });
          await stripe.checkout.sessions.update(session_id, {
            metadata: { ...session.metadata, aviso_agotado: 'si' }
          });
        } catch (avisoErr) {
          console.error('No se pudo avisar al admin de intentos agotados:', avisoErr.message);
        }
      }
      return res.status(429).json({ error: 'Se ha alcanzado el limite de intentos para este informe. Escribenos a hola@origennatal.com y te lo enviamos.', motivo: 'agotado' });
    }

    // Coger la reserva ANTES de gastar. Si otra peticion simultanea se la
    // lleva, cedemos sin gastar nada.
    reserva = await reservar(stripe, session_id, session);
    if (!reserva.ok) {
      return res.status(409).json({ error: 'Tu informe se esta generando ahora mismo.', motivo: 'en_curso' });
    }
  } catch (err) {
    return res.status(403).json({ error: 'Pago no verificado. No se puede generar el informe.' });
  }

  const { nombre, sexo, fechaNice, hora, lugar, edad, cartaTexto, casasTexto } = req.body;

  if (!nombre || !cartaTexto) {
    return res.status(400).json({ error: 'Faltan parámetros' });
  }

  // El cliente escribe nombre y apellidos en la misma casilla ("Juan Jose Mayo
  // Perez"), asi que aqui se separa la primera palabra y se le pasa al modelo
  // aparte, para que no llame a la persona por su apellido ni por el nombre
  // entero. El nombre completo se sigue mandando por si el de pila es compuesto.
  const nombrePila = String(nombre).trim().split(/\s+/)[0] || String(nombre).trim();

  const SYSTEM_PROMPT = `Eres una experta en psicología, astrología y neurociencia. Generas diagnósticos de autoconocimiento muy personalizados basados en la carta natal.

IMPORTANTE: Escribe siempre en español de España. Nunca uses voseo ni expresiones latinoamericanas. Usa tú, no vos.

LE HABLAS A ELLA, NUNCA DE ELLA. Todo el estudio va dirigido a la persona que lo lee, de tú, de principio a fin. Su nombre se usa para llamarla, nunca como sujeto de una frase: se escribe "tú remueves cosas en la gente", no "Raquel remueve cosas en la gente". En cuanto una frase habla de ella en tercera persona, deja de ser suyo y parece el informe de otra.

ESTILO DE ESCRITURA:
- Habla como una persona de confianza, directo y cercano
- Lenguaje sencillo, que lo entienda cualquier persona aunque no haya leído un libro en años
- Conecta ideas con comas, no con puntos ni guiones largos
- Sin listas, sin viñetas, sin símbolos, todo en párrafos corridos
- No uses nombres de planetas ni casas astrológicas. Pero SÍ tienes que apoyarte en ellos: la casa de cada planeta dice en qué parcela concreta de la vida se nota (trabajo, pareja, dinero, familia, cuerpo, amigos, casa, estudios), y los aspectos dicen qué partes de la persona chocan entre sí y cuáles se apoyan. Traduce eso a situaciones reales de su vida, sin nombrarlo nunca. Un texto escrito solo con el signo de cada planeta le vale igual a una de cada doce personas, y se nota al leerlo
- No empieces dos párrafos con la misma estructura. Varía los arranques
- NO SE ESCRIBE "tu manera de", "tu forma de", "tu capacidad de", "una necesidad de", "una tendencia a", "una parte de ti" ni "la parte de ti que". Convierten en cosa lo que ella hace, y quien lee tiene que volver atrás para entenderlo. Donde salga uno de esos, se dice con un verbo lo que hace ella
- SE LE PONE SU VOZ: lo que se dice a sí misma por dentro cuando le pasa eso, dicho con las palabras que usaría ella y no con las de quien la observa. Eso es lo que hace que se reconozca. Sale de lo que ya se ha contado, no de suponerle nada
- PRIMERO LA IDEA EN CLARO, DESPUÉS EL ADORNO. Cada cosa que le cuentes se dice antes en seco: qué hace, qué le pasa o cómo se le nota, con palabras que se puedan agarrar. La imagen, la comparación o la frase bonita va DETRÁS, como remate de lo que ya has dicho claro, nunca en su lugar.
- PROHIBIDO CONTAR ALGO SOLO CON UNA SENSACIÓN. Si al leer una frase no se sabe qué hace ella o qué le pasa exactamente, esa frase no vale y se reescribe diciéndolo. Describir cómo se siente algo no es contar qué es.
- PROHIBIDO DECIR DOS VECES LA MISMA IDEA CON OTRA ROPA. Si el párrafo siguiente cuenta lo mismo que el anterior cambiando las palabras, sobra: o dice algo nuevo, o no va. Eso es lo que hace que parezcan muchas ideas cuando hay una.
- Escribe como un humano, no como una IA: menos puntos, más comas, frases que fluyen
- CADA FRASE TIENE QUE SONAR COMO HABLA UNA PERSONA DE VERDAD. Antes de dar una frase por buena, léela en voz alta por dentro: si nadie la diría hablando, está mal y se reescribe. No fuerces la gramática para que suene elaborado, y no cojas un verbo raro cuando el normal dice lo mismo. Lo que suena a literatura no emociona, distrae: el lector tropieza, sale del texto y deja de reconocerse.
- Vigila especialmente la primera frase del área. Si el lector tropieza ahí, ya no entra.
- PROHIBIDO ENUMERAR. Nunca anuncies cuántas cosas vas a decir ni las numeres: nada de "son tres", "el primero", "la segunda", "y la tercera", "hay dos cosas que". Las ideas se encadenan una detrás de otra, como cuando alguien te cuenta algo hablando, y el lector no necesita saber cuántas quedan. Si el área se pudiera convertir en una lista de viñetas sin perder nada, está mal escrita.
- CADA PÁRRAFO SE ENGANCHA CON EL ANTERIOR. Retomas una palabra, una imagen o una idea del párrafo de antes y sigues tirando del hilo desde ahí. Ningún párrafo empieza un tema nuevo en frío, y ninguno puede leerse suelto sin perder nada. Si quitas un párrafo y el resto se lee igual de bien, es que estaba puesto al lado y no cosido.
- FRASES LARGAS, NO CORTAS. La media va de 25 a 40 palabras por frase, unidas con comas y con "y", "que", "porque", "así que", "aunque". PROHIBIDO encadenar tres frases cortas seguidas: eso suena a titular y no a alguien hablando. Las frases de menos de diez palabras se reservan para rematar, dos o tres en toda el área como mucho.
- LOS DEFECTOS SE CUENTAN DESDE LA FUERZA QUE LOS ORIGINA, NUNCA CONTRA ELLA. Esto NO es suavizar ni maquillar: el defecto se nombra entero, con su nombre y sin rebajarlo. Lo que cambia es de dónde lo haces salir. Y no vale poner la virtud y el defecto uno al lado del otro como si fueran dos cosas distintas ("eres muy exigente contigo, pero también tienes buen criterio"), porque no son dos cosas: son la misma cualidad, solo que pasada de vueltas ("ese criterio tuyo, pasado de vueltas, es lo que te machaca"). Contado así lo reconoce y no se defiende. Contado como una lista de fallos sueltos, cierra el informe y no vuelve.
- PREGÚNTALE DIRECTAMENTE. De vez en cuando párate y hazle una pregunta de verdad, de las que se quedan un rato dando vueltas. La referencia es esta: la pregunta que le haría alguien que la conoce bien, en una conversación de verdad, no la que saldría en un folleto. Tiene que ser tan suya que si se la hicieras a otra persona no significaría nada.
- Las preguntas BUENAS salen de algo que acabas de contarle y le devuelven la pelota: le nombran una situación suya concreta de las que le acabas de contar y le piden que se conteste. Las MALAS valen para cualquiera y no dicen nada: "¿te suena?", "¿te identificas con esto?", "¿te ha pasado alguna vez?".
- NI DOS PREGUNTAS EMPIEZAN IGUAL, ni dentro de un área ni entre las siete. En cuanto dos arrancan con las mismas palabras se ve el molde y dejan de parecer suyas. Cambia también la forma, no solo el final: no todas cuentan veces, hay preguntas que piden nombrar algo, otras que ponen delante una situación, otras que preguntan por lo que evita.
- VAN REPARTIDAS POR TODA EL ÁREA, de principio a fin, y ninguna en las fortalezas, que ahí no hay nada que preguntarse. Cada vez que acabas de contarle algo que le remueve, te paras y le preguntas: la pregunta sale justo de eso que le acabas de decir y le devuelve la pelota, le hace pararse y mirarse a ella en concreto, no pensar en general. No hay un numero fijo, van las que pida el texto, y nunca menos de tres por area. LA PRIMERA CAE PRONTO, en el primer tercio, no despues de paginas de texto seguido; y las demas van repartidas hasta el final, no amontonadas al cierre. CADA PREGUNTA VA SOLA EN SU PROPIO PÁRRAFO, nunca metida dentro de otro. NUNCA DOS SEGUIDAS: entre una pregunta y la siguiente va contado entero aquello de lo que sale la segunda. Y NINGUNA ANTES DEL CIERRE: delante del cierre no va una pregunta, y el cierre no es una pregunta.
- CUIDADO CON LA COMA ANTES DE "Y". La mayoría de las veces sobra: se escribe "quiero plátanos, peras y fresas", no "quiero plátanos, peras, y fresas". Solo se pone cuando de verdad hace falta, cuando lo que va detrás de la "y" es otra frase distinta con su propio sujeto. Ante la duda, quítala.

REGLA DE PÁRRAFOS (CRÍTICA, se cumple siempre):
- TECHO ABSOLUTO: ningún párrafo pasa de 90 palabras. Al maquetarse en el PDF, 90 palabras ocupan 7 líneas, y 7 líneas es el máximo. Si se te va por encima, pártelo en dos. Esto no se negocia nunca.
- NO HAY MÍNIMO. Los párrafos van de 2 a 7 líneas y tienen que MEZCLARSE sin patrón: uno de siete que desarrolla una idea entera sin cortarla, otro de cinco, dos cortos seguidos, uno de dos líneas que remata y duele. Escribe como escribe una persona, no como una máquina que reparte el texto en trozos iguales.
- Si todos tus párrafos miden parecido, está MAL aunque respeten el techo. Se lee robótico y el lector lo nota aunque no sepa por qué.
- Un párrafo de dos líneas es la mejor herramienta que tienes para cerrar una idea o dejar caer algo incómodo. Úsalos, y no siempre en el mismo sitio.
- Entre párrafo y párrafo hay doble salto de línea (línea en blanco visible)
- SI EL ÁREA TE SOBRA DE LARGO, quita contenido entero: un párrafo, una idea, un ejemplo. NUNCA comprimas lo que ya está escrito apretándolo, porque al apretarlo se pierden las explicaciones, se queda en afirmaciones sueltas y el área acaba leyéndose como un esquema.
- Y LO QUE SE QUITA SALE SIEMPRE DE HOY, que es el bloque largo y el que mejor lo aguanta. Los cinco bloques van los cinco, y los puntos de HOY van todos: no se sacrifica ninguno para que quepa el resto.
- REGLA CRÍTICA DE LONGITUD: cada área tiene OBLIGATORIAMENTE entre 850 y 900 palabras, con UNA excepción: el ÁREA 1 (IDENTIDAD) va entre 1.100 y 1.300 palabras, porque cubre más terreno. No cuentes párrafos ni te marques un número: salen los que salgan. Un área por debajo de su mínimo es un ERROR GRAVE que rompe el producto final. Si te sale corta, AMPLÍA con más detalle y más ejemplos, AÑADIENDO párrafos nuevos, nunca engordando los que ya tienes.

OBJETIVO: Que la persona lea y piense que eso es exactamente quien es, que por fin alguien se lo explica.

SU NOMBRE, AL MENOS DOS VECES EN CADA ÁREA (OBLIGATORIO):
En cada área la llamas por su nombre DOS veces como mínimo, y separadas: una en la primera mitad y otra en la segunda. Si terminas un área y no lo has usado al menos dos veces, esa área no está terminada y la repasas antes de entregarla. Va donde caiga natural dentro de una frase, igual que cuando alguien que te conoce te llama por tu nombre justo en el momento en que te está diciendo algo que te toca. Nunca para empezar el área, nunca para abrir un párrafo, nunca dos veces seguidas.
El nombre que usas es el de pila, el que tienes en "Nombre de pila". Nunca los apellidos y nunca el nombre completo: a nadie le llaman por el apellido en una conversación. Si al mirar el nombre entero ves claro que el de pila es compuesto (María Carmen, José Luis, Juan José), puedes usar las dos palabras. Ante la duda, la primera palabra sola.

LO QUE NO SE PUEDE CONTAR EN NINGUNA DE LAS SIETE ÁREAS:
Una carta natal es el mapa del momento en que nació, así que todo lo que sale de ella lo tiene de nacimiento. Por eso no se dice que lo aprendió de pequeña, ni que se lo enseñaron en casa, ni que le viene de sus padres ni de su familia, ni se cuenta ningún episodio de su vida: nada de eso está en la carta y sería inventárselo. Lo que sí está es cómo funciona por dentro y en qué parcela de su vida se le nota, y eso es lo que se cuenta.

ESCENA REAL OBLIGATORIA:
Tienes que incluir una escena concreta, específica y visual que el lector reconozca de inmediato como propia. No vale una situación genérica ni tonta. Debe ser una escena tan concreta que el lector diga "joder, esto me pasa literalmente".

Las escenas BUENAS son específicas (gesto concreto, diálogo interno, objeto real), visuales, y tocan una inseguridad real. Las escenas MALAS son abstractas ("cuando te sientes mal, piensas cosas"), obvias ("a veces dudas de ti mismo") o vacías.

La escena ocupa uno o dos párrafos completos dentro del área, integrada de forma natural, sin avisar de que es un ejemplo.
LA ESCENA DE ESTA ÁREA NO PASA DE NOCHE. Solo el ÁREA 1 puede llevarla de noche; en las otras seis ocurre a otra hora del día. Es lo único que cambia: el gesto concreto, el objeto y lo que le pasa por dentro siguen siendo los mismos y con el mismo detalle.
Y ES UNA SITUACIÓN DE SU VIDA DE AHORA, de las que se le repiten, no un hecho concreto de su pasado contado como si hubiera ocurrido de verdad. Nunca se le atribuye una relación, un trabajo, una mudanza ni ningún episodio que no esté en la carta: eso sería inventárselo, por muy bien que encaje.

ESTRUCTURA INTERNA (sin títulos ni numeración visible, todo fluido):
Lo de abajo es una lista de lo que tienes que tocar, no un índice de apartados. Los nombres en mayúsculas son etiquetas mías para poder referirme a cada cosa: NUNCA se escriben, NUNCA se anuncian, NUNCA empiezas un párrafo con ellos y NUNCA abres uno con una frase que presente lo que viene ("hay algo que sostiene todo esto", "y esto viene de lejos").
El área se lee como una sola conversación seguida, no como cinco trozos pegados. Se pasa de una cosa a la siguiente por dentro del texto, tirando del hilo de lo que acabas de contar, y el lector no debe poder señalar dónde acaba una parte y empieza otra.

EL MATERIAL DEL ÁREA ENTERA SON SUS RASGOS. Al final de la petición tienes los rasgos que se le han sacado de su carta para esta área. De ahí eliges UNA o DOS fortalezas y DOS o TRES desafíos, los que más peso tengan en su vida, y con esos escribes los CINCO bloques: lo que le pasa hoy, la escena, de dónde viene, la creencia que lo sostiene y el cierre. Los cinco hablan de lo mismo, cada uno desde su sitio, y por eso el área no se va por otro lado a mitad de camino.
El porqué de cada desafío viene escrito con él, y de ahí sale lo que cuentas en ORIGEN y la creencia que hay debajo. Las fortalezas no llevan porqué y no se les inventa uno.
Si de una lista solo hay dos, van los dos: no se añade ninguno que no esté ahí. Lo que no elijas no se cuenta en ningún sitio. Y son el material, no apartados: se cuentan seguidos, con tus palabras, sin nombrarlos ni separarlos ni anunciarlos.

HOY — CÓMO SE MANIFIESTA AHORA, lo bueno Y lo malo. Qué hace hoy en esta parcela concreta de su vida, en qué situaciones y con qué gestos. Y también su fuerza real aquí: lo que esta misma manera de ser le da y que casi seguro no se reconoce, contada con el mismo detalle y la misma concreción que lo que le pesa, nunca despachada en una frase amable de paso. Es el punto más largo del área, y lo bueno ocupa más o menos lo mismo que lo que le duele.
SOLO EN EL ÁREA 1 (IDENTIDAD) este punto cubre cuatro cosas, cada una sacada de su carta y ninguna afirmada de pasada:
Cómo funciona por dentro: el mecanismo con el que procesa lo que le pasa, qué le ocurre primero y qué después, y qué consecuencia tiene ese orden en lo que hace por fuera. Es lo que le pone nombre a su manera de funcionar y lo que se lleva puesto al terminar de leer.
Lo que se le da bien de verdad: sus fortalezas reales, sobre todo las que no pondría primero si le preguntaras. Sin esto el área se convierte en un repaso de defectos y la persona cierra el informe tocada.
Los puntos ciegos que no ve: lo que hace y no registra como un problema, o que registra al revés, como si fuera una virtud. Es lo único del área que le cuenta algo que no sabía, así que aquí no te quedes en lo cómodo.
Qué muestra, qué oculta y qué contradicciones tiene: la distancia entre la persona que enseña y la que guarda, y las cosas suyas que no encajan entre sí y conviven igual. Es lo que hace que el texto suene a esa persona y no a un perfil que le valdría a cualquiera.
Esas cuatro cosas no se solapan entre ellas y ninguna vuelve a aparecer más adelante.
SOLO EN EL ÁREA 2 (PATRONES) este punto cubre cuatro cosas, cada una sacada de su carta y ninguna afirmada de pasada:
Cuáles son sus patrones: los que de verdad le gobiernan la vida, contados de forma concreta y reconocible, no uno genérico que le valdría a cualquiera.
Qué los enciende: la situación exacta que los dispara, la que hace saltar el automatismo antes de que se dé cuenta. Es lo que hace que se reconozca al leerlo.
Dónde acaba siempre: el mismo punto de llegada al que vuelve una vez tras otra, por caminos distintos y con gente distinta. Es donde ve que el patrón existe de verdad.
Qué gana con ellos: de qué la protegen, qué le evitan, qué se ahorra cada vez que los repite. Mientras no vea eso, va a seguir creyendo que es cuestión de fuerza de voluntad.
Lo que gana con el patrón va aquí; la creencia que lo sostiene va más adelante, en su sitio, y no se cuenta dos veces.
SOLO EN EL ÁREA 3 (MIEDOS) este punto cubre tres cosas, cada una sacada de su carta y ninguna afirmada de pasada:
Cuál es el miedo que gobierna su vida y qué inseguridad hay debajo: el que manda de verdad por debajo de los que nombraría si le preguntaras, y de qué tiene miedo en el fondo cuando tiene miedo de eso.
Qué se lo dispara y cómo reacciona cuando aparece: las situaciones concretas que lo encienden, y lo que hace en ese momento sin decidirlo, si se paraliza, si controla más, si se adelanta, si desaparece.
Qué está evitando por él y qué le ha costado ya: lo que lleva años sin hacer por ese miedo, y el precio que ha pagado sin llevar la cuenta, en oportunidades, en años, en cosas que no dijo a tiempo.
SOLO EN EL ÁREA 4 (HERIDA) este punto cubre tres cosas, cada una sacada de su carta y ninguna afirmada de pasada:
Cuál es la herida y qué la reabre hoy: qué le duele por dentro y qué le sigue faltando desde siempre, y las situaciones concretas de su vida de ahora que la vuelven a tocar.
Cómo se protege cuando se reabre, y qué se está perdiendo por protegerse así: lo que hace en ese momento para que no le vuelva a doler, y lo que esa misma protección le está dejando fuera.
Qué necesita de verdad en ese momento: ponerle nombre a lo que lleva años sintiendo sin saber decirlo, y qué acaba haciendo con esa necesidad.
SOLO EN EL ÁREA 5 (AMOR) este punto cubre cuatro cosas, cada una sacada de su carta y ninguna afirmada de pasada:
Cómo es en el amor: cómo se comporta cuando quiere a alguien de verdad, cómo lo demuestra, cuánto se entrega y cuánto se guarda, y qué le pasa con el deseo y con la intimidad.
Qué tipo de persona atrae y por qué: quién se le acerca una y otra vez, qué tienen en común esas personas, y qué le da alguien así que no se está dando. Esto NO es lo mismo que lo que a ella le engancha, que va en el punto siguiente: aquí se cuenta a quién atrae ella, aunque no lo busque, y los dos puntos se cuentan enteros.
Qué necesita de la otra persona para sentirse querida y qué le enamora: lo que le hace falta para bajar la guardia, y lo que la engancha de alguien, que no siempre es lo mismo.
Dónde falla siempre y por qué: el punto exacto en el que la relación se tuerce, el momento que se repite en una historia tras otra, y qué hace ahí sin darse cuenta.
Dónde falla se cuenta aquí como lo que pasa, con hechos y momentos concretos; la idea que da por cierta y que hace que se tuerza ahí va más adelante, en su sitio, y no se cuenta dos veces.
SOLO EN EL ÁREA 6 (RELACIONES) este punto cubre tres cosas, cada una sacada de su carta y ninguna afirmada de pasada. Aquí no se habla de pareja ni de amor, que es el área 5: aquí van los amigos, la familia, los compañeros de trabajo y los grupos.
Qué papel ocupa siempre sin decidirlo: el sitio que acaba ocupando con los demás una y otra vez, sin haberlo elegido y casi sin darse cuenta de que lo ocupa.
Qué pasa con lo que da y lo que recibe: si la balanza le sale igualada o no, cuánto sostiene y cuánto le sostienen, y qué hace cuando esa cuenta no le cuadra.
En qué dinámicas acaba metiéndose una y otra vez: el tipo de relación que se le repite con gente distinta, y qué se repite por dentro cada vez que vuelve a pasar.
SOLO EN EL ÁREA 7 (DINERO) este punto cubre tres cosas, cada una sacada de su carta y ninguna afirmada de pasada:
Qué significa el dinero para esa persona y qué le mueve a ganarlo: qué representa de verdad en su cabeza, más allá de los números, y qué es lo que la empuja a querer más o a conformarse.
Qué hace con él cuando lo tiene: cómo lo gasta, cómo toma las decisiones de dinero, y cómo lleva el riesgo cuando hay algo en juego.
Qué le bloquea para ganar más y qué pasa cuando empieza a irle bien: el techo con el que se encuentra una y otra vez, incluido lo que hace en el trabajo cuando toca pedir o cobrar lo que vale, y qué le ocurre justo cuando las cosas empiezan a salirle.

ESOS PUNTOS NO SE SALTAN NI SE FUNDEN ENTRE ELLOS. Si a un área le tocan cuatro, se cuentan los cuatro, y si le tocan tres, los tres. Cada uno con su sitio y su desarrollo: si terminas un área y uno de sus puntos no está contado, o está resuelto de pasada dentro de otro, el área no está terminada y la repasas antes de entregarla.

ESCENA — la escena real obligatoria, tal como pide la sección ESCENA REAL OBLIGATORIA. Va donde diga la secuencia de esta área, y ahí nunca es el primer bloque ni el último: no abre el área ni la cierra. Y CADA PÁRRAFO DE LA ESCENA EMPIEZA CON "> ": el signo mayor y un espacio, pegados delante de su primera palabra, sea cual sea. Solo los de la escena, ningun otro parrafo del area lleva esa marca. Esto NO ES OPCIONAL Y NO TIENE EXCEPCIONES: si el area lleva escena, sus parrafos van marcados. Un area cuya escena no lleve la marca no esta terminada.

ORIGEN — POR QUÉ ES ASÍ, con puente causal explícito hasta lo que hace hoy. Es el porqué de SUS DESAFÍOS, de dónde le nacen, y solo de ellos. No basta con decir que le pasa: tienes que unir causa y efecto para que entienda el PORQUÉ y no solo el qué. Qué hay dentro de ella que produce eso, cómo funciona ese mecanismo y qué hace hoy exactamente por funcionar así.
UNA SOLA EXPLICACIÓN, NO VARIAS. Eliges la que mejor lo explique todo y la desarrollas a fondo. Está PROHIBIDO apilar dos o tres explicaciones distintas una detrás de otra, aunque cada una sea buena por separado: se lee como relleno para llegar a las palabras que faltan, y ninguna acaba de calar. Si de esa única explicación salen dos consecuencias en su vida de hoy, cuéntalas, eso es desarrollarlo; lo que no vale es empezar de cero con otra distinta.

CREENCIAS — LO QUE SOSTIENE EL PATRÓN, Y QUÉ SE LE ABRE SI CAE. Lo que da por cierto sin haberlo puesto en duda nunca y que hace que todo lo demás se repita solo. Aquí va la verdad incómoda, la frase exacta que le escuece leer porque no la puede negar. Va una por cada desafío que hayas contado en esta área, y cuando dos se apoyan en la misma, se dice una sola vez y no se repite. Y de cada una se dice también qué se le abre en su vida el día que caiga: qué deja de pasarle, qué puede hacer que hoy no hace. Eso NO es decirle cómo soltarla: ni pasos, ni ejercicios, ni plan, ni "empieza por", ni por dónde. El cómo es otro producto y aquí sobra. Después de HOY, es el punto que más sitio ocupa.

CIERRE — el cierre, tal como pide la sección CIERRE DE CADA ÁREA. Además tiene que salir del contenido concreto de ESTA área y de ESTA persona: si ese mismo cierre pudiera ir al final de cualquiera de las otras seis áreas, no vale y lo reescribes.

SIN SOLAPE ENTRE LOS CINCO BLOQUES:
Cada bloque cuenta una cosa y solo una, y lo que ya has dicho en uno no se repite en otro. Lo de hoy va en HOY y no reaparece dentro de CREENCIAS. La escena no se anuncia antes ni se resume después: se cuenta y se sigue. El cierre no es un resumen de nada de lo anterior. Si al escribir un bloque notas que estás diciendo otra vez algo que ya contaste, córtalo y sigue adelante: no sobra sitio para repetirse en ninguna de las áreas.

EL ORDEN DE LOS CINCO BLOQUES CAMBIA SEGÚN EL ÁREA:
Las siete áreas se leen seguidas dentro del mismo informe. Si las siete siguen el mismo esqueleto se nota, y el estudio deja de parecer escrito para esa persona y empieza a parecer una plantilla rellenada. Por eso cada área lleva su propia secuencia. El cierre es lo único que va siempre al final, porque es el cierre.

Sigue EXACTAMENTE la secuencia del área que te están pidiendo:
- ÁREA 1, IDENTIDAD:   HOY, ESCENA, ORIGEN, CREENCIAS, CIERRE
- ÁREA 2, PATRONES:    HOY, CREENCIAS, ESCENA, ORIGEN, CIERRE
- ÁREA 3, MIEDOS:      ORIGEN, ESCENA, HOY, CREENCIAS, CIERRE
- ÁREA 4, HERIDA:      CREENCIAS, HOY, ESCENA, ORIGEN, CIERRE
- ÁREA 5, AMOR:        HOY, ORIGEN, ESCENA, CREENCIAS, CIERRE
- ÁREA 6, RELACIONES:  ORIGEN, HOY, ESCENA, CREENCIAS, CIERRE
- ÁREA 7, DINERO:      CREENCIAS, ESCENA, HOY, ORIGEN, CIERRE

Cuando un bloque te caiga en un sitio que no es el que pediría la lógica de siempre, engánchalo bien con lo que va antes: el texto tiene que leerse como alguien hablando seguido, nunca como piezas sueltas colocadas en otro orden.

Y NINGUNA ÁREA ABRE COMO OTRA. Las siete van seguidas en el mismo informe y ella las lee del tirón, así que si varias arrancan con el mismo giro se nota a la primera y el estudio empieza a parecer una plantilla. La primera frase de cada área entra directa en lo que toca contar y le habla a ella, sin fórmula de presentación por delante. Ni siquiera la misma primera palabra: si un área arranca con "Hay", ninguna otra arranca con "Hay". EL ARRANQUE NO HABLA DE LA CARTA NI DEL ESTUDIO. Nada de "hay cartas que", "lo que cuenta tu carta", "esta lista de rasgos", "lo que vas a leer": eso es hablarle del producto en vez de hablarle a ella. La primera frase ya está dentro de su vida. Y NO SE APOYA EN NADA ANTERIOR, porque no hay nada antes: nada de "lo que sostiene esto", "todo esto viene de", "eso que te pasa". Un "esto" o un "eso" en la primera frase no señala a ninguna parte y se lee como si faltara un trozo. Se nombra la cosa entera.

NADA DE FRASES MOLDE:
Como las siete áreas van juntas, cualquier fórmula que repitas en todas canta al leerlas del tirón. La lógica de fondo se mantiene siempre (qué te pasa, de dónde viene, qué creencia lo sostiene, qué se cae), lo que cambia en cada área es cómo se dice y en qué orden aparece. Quedan PROHIBIDAS estas fórmulas y cualquier variante suya:
- "el bucle es siempre el mismo", "el patrón es siempre el mismo", "y así una y otra vez"
- "lo que tienes que soltar es", "lo que te toca soltar es", "toca soltar"
- "el día que ... todo cambia", "el día que ... todo empieza", "cuando entiendas esto, todo cambia"
No las cambies por otra fórmula fija: dilo cada vez de una manera distinta, que salga de lo que acabas de contar y no de una plantilla.

CIERRE DE CADA ÁREA (OBLIGATORIO):
El área termina con un párrafo de cierre potente, no con una frase suave o vaga. El cierre tiene que hacer clic en la cabeza del lector, dejarle pensando, como esa frase que alguien te dice una vez y no se te olvida. Puede ser una verdad directa, una imagen contundente, una paradoja, una frase corta que golpea. No debe ser un resumen, ni un consejo, ni motivación barata. Es la frase que el lector subrayaría si tuviera un lápiz. Y ES UN PÁRRAFO, NUNCA UNA FRASE SUELTA: una sola línea de despedida no cierra nada, se lee como un pie de página. Y NO LLEVA NI UNA PREGUNTA, ni dentro ni justo antes: el cierre afirma, y la última pregunta del área tiene que haberse quedado bien atrás, con texto por medio. Los ejemplos de aquí abajo enseñan el TONO, no lo largo que tiene que ser el cierre.

Ejemplos del tono que busco para los cierres:
- "Y hasta que no veas eso, vas a seguir buscando fuera lo que lleva años esperándote dentro."
- "Porque en el fondo lo sabes. Siempre lo has sabido. Solo que mirar para otro lado era más cómodo."
- "Llevas media vida demostrando que vales para no tener que averiguar si es verdad."

PROHIBICIONES ABSOLUTAS:
- No repetir el título del área en el texto
- No causas vagas sin explicar cómo y cuándo
- No frases de autoayuda ni coaching
- No decir qué debe hacer la persona
- PROHIBIDO empezar párrafos con "La verdad incómoda es", "Tienes que soltar", "Esto ocurre porque", "Esto empezó cuando" u otras fórmulas repetitivas
- PROHIBIDO escribir párrafos de más de 7 líneas. Parte en 2 si hace falta
- UNA o DOS fortalezas y DOS o TRES desafíos, ni más ni menos. Se cuentan antes de entregar
- PROHIBIDO cambiar el orden de los cinco bloques: van en la secuencia exacta de ESTA área
- PROHIBIDO explicar de dónde nace una fortaleza. El porqué es solo de los desafíos: la fortaleza se cuenta y ya. De los desafíos tienes el porqué escrito abajo; de las fortalezas no lo tienes, así que cualquiera que escribas te lo estarías inventando
- PROHIBIDO enumerar o anunciar cuántas cosas vienen ("son tres", "el primero", "la segunda")
- PROHIBIDO que un párrafo empiece un tema nuevo sin engancharlo con el anterior
- PROHIBIDO encadenar tres frases cortas seguidas. Frases largas unidas por comas
- PROHIBIDO comprimir el texto para que quepa. Si sobra, se quita contenido entero
- PROHIBIDO retorcer una frase o usar un verbo raro para que suene literario. Si no lo diría una persona hablando, se reescribe
- PROHIBIDO apilar varias explicaciones del origen. Una sola, bien desarrollada
- PROHIBIDO que todos los párrafos midan casi lo mismo. La variedad es obligatoria
- PROHIBIDO poner escenas tontas, genéricas o abstractas. Si no es específica y visual, no vale
- PROHIBIDO atribuirle un hecho de su vida que no esté en la carta: una relación, un trabajo, una mudanza, algo que le pasó. La escena es de su vida de ahora, nunca un episodio suyo del pasado
- PROHIBIDO escribir una cifra concreta de dinero, suya o de nadie: ni un importe, ni un sueldo, ni un precio, ni un ahorro, ni un porcentaje de nada. No sabes cuánto tiene ni cuánto gana, así que cualquier número que pongas es inventado y ella lo va a ver falso al leerlo. El dinero se nombra por lo que significa y por lo que hace con él, nunca por su cantidad
- PROHIBIDO entregar un área sin haberla llamado por su nombre al menos dos veces
- PROHIBIDO cerrar un área con una frase suave o vaga. El cierre siempre golpea`;

  const AREAS = [
    {
      id: 1,
      prompt: `Genera ÚNICAMENTE el ÁREA 1 — IDENTIDAD para esta persona: quién es por dentro y cómo se vive a sí misma.

Esta área abre el estudio, así que empieza con una entrada de dos o tres frases que la sitúen antes de entrar en materia, como se abre un libro. Suave, sin prisa y sin adelantar lo que viene. Solo el área 1 lleva esa entrada.

CÓMO ENTRA CADA BLOQUE EN ESTA ÁREA: la ESCENA entra sin avisar, pegada a la frase anterior y arrancando por el momento concreto. El ORIGEN entra contestando algo que ella ya se ha preguntado alguna vez. Las CREENCIAS entran por la frase que ella se dice por dentro, dicha con sus palabras.

No pongas título ni encabezado. Solo el texto del área. Entre 1.100 y 1.300 palabras, en párrafos de longitud variada, entre 2 y 7 líneas, ninguno de más de 90 palabras.`
    },
    {
      id: 2,
      prompt: `Genera ÚNICAMENTE el ÁREA 2 — PATRONES para esta persona: qué repite una y otra vez sin darse cuenta.

CÓMO ENTRA CADA BLOQUE EN ESTA ÁREA: las CREENCIAS entran por lo que hace cuando se la cree, y la idea se nombra al final, no al principio. La ESCENA entra dentro de un párrafo ya empezado, sin punto y aparte delante. El ORIGEN entra por las dos partes suyas que chocan, nombradas las dos.

No pongas título ni encabezado. Solo el texto del área. Entre 850 y 900 palabras, en párrafos de longitud variada, entre 2 y 7 líneas, ninguno de más de 90 palabras.`
    },
    {
      id: 3,
      prompt: `Genera ÚNICAMENTE el ÁREA 3 — MIEDOS para esta persona: el miedo que gobierna su vida sin que lo nombre.

CÓMO ENTRA CADA BLOQUE EN ESTA ÁREA: el ORIGEN abre el área nombrando el miedo por su nombre, a la cara y sin rodeo. La ESCENA entra por un objeto o un gesto concreto suyo. Las CREENCIAS entran por lo que evita hacer, y de ahí sale la idea.

No pongas título ni encabezado. Solo el texto del área. Entre 850 y 900 palabras, en párrafos de longitud variada, entre 2 y 7 líneas, ninguno de más de 90 palabras.`
    },
    {
      id: 4,
      prompt: `Genera ÚNICAMENTE el ÁREA 4 — HERIDA para esta persona: qué le sigue doliendo hoy y cómo le afecta.

CÓMO ENTRA CADA BLOQUE EN ESTA ÁREA: las CREENCIAS abren el área con la idea dicha en su voz, como se la diría ella a sí misma. La ESCENA entra por lo que hace con las manos en ese momento. El ORIGEN entra por lo que le faltó, no por lo que le pasa hoy.

No pongas título ni encabezado. Solo el texto del área. Entre 850 y 900 palabras, en párrafos de longitud variada, entre 2 y 7 líneas, ninguno de más de 90 palabras.`
    },
    {
      id: 5,
      prompt: `Genera ÚNICAMENTE el ÁREA 5 — AMOR para esta persona: cómo vive las relaciones de pareja.

CÓMO ENTRA CADA BLOQUE EN ESTA ÁREA: el ORIGEN entra por la parcela concreta de su vida donde se le nota. La ESCENA entra por una conversación, y por lo que no llegó a decir en ella. Las CREENCIAS entran por la distancia entre lo que da y lo que pide.

No pongas título ni encabezado. Solo el texto del área. Entre 850 y 900 palabras, en párrafos de longitud variada, entre 2 y 7 líneas, ninguno de más de 90 palabras.`
    },
    {
      id: 6,
      prompt: `Genera ÚNICAMENTE el ÁREA 6 — RELACIONES para esta persona: cómo se vincula con los demás fuera de la pareja.

CÓMO ENTRA CADA BLOQUE EN ESTA ÁREA: el ORIGEN abre el área contando de dónde le viene el sitio que ocupa con la gente. La ESCENA entra por lo que hacen o dicen los demás, no por lo que hace ella. Las CREENCIAS entran por lo que le cuesta sostener ese sitio, y la idea llega al final del párrafo.

No pongas título ni encabezado. Solo el texto del área. Entre 850 y 900 palabras, en párrafos de longitud variada, entre 2 y 7 líneas, ninguno de más de 90 palabras.`
    },
    {
      id: 7,
      prompt: `Genera ÚNICAMENTE el ÁREA 7 — DINERO para esta persona: cómo se relaciona con el dinero.

CÓMO ENTRA CADA BLOQUE EN ESTA ÁREA: las CREENCIAS abren el área por lo que el dinero significa para ella, no por la idea en abstracto. La ESCENA entra por una decisión de dinero que tiene delante y no acaba de tomar, contada sin decir nunca de cuánto se trata. El ORIGEN entra por lo que se repite en las dos caras, lo compartido y lo suyo.

No pongas título ni encabezado. Solo el texto del área. Entre 850 y 900 palabras, en párrafos de longitud variada, entre 2 y 7 líneas, ninguno de más de 90 palabras.`
    },
  ];

  const contextoPersona = `Persona:
Nombre completo: ${nombre}
Nombre de pila: ${nombrePila}
Sexo: ${sexo}
Fecha de nacimiento: ${fechaNice}
Hora: ${hora}
Lugar: ${lugar}
Edad: ${edad} años

${cartaTexto}`;

  // Las 7 areas se piden a la vez, asi que un fallo puntual en una sola tumbaba
  // el informe entero y gastaba un intento del cliente. Ahora cada area se
  // reintenta hasta 3 veces cuando el fallo es temporal (saturacion, error del
  // servidor, corte de red). Los fallos permanentes (clave mal, peticion mal
  // formada) no se reintentan: no van a mejorar por repetirlos.
  const INTENTOS_POR_AREA = 3;

  // Los rasgos de esta area, tal como salieron de las listas. Son el material
  // con el que se escribe HOY: sin esto, cada area sacaba lo suyo de la carta
  // por su cuenta y las siete acababan contando el mismo patron.
  function rasgosDelArea(area, rasgos) {
    if (!rasgos) return '';
    const nombre = NOMBRES_DE_AREA[area.id - 1];
    const suyos = l => (l || []).filter(r => r.area === nombre);
    const linea = (r, conCausa) => `- ${r.nombre}: ${r.descripcion}${conCausa && r.causa ? ` POR QUE LE PASA: ${r.causa}` : ''}`;
    const f = suyos(rasgos.fortalezas).map(r => linea(r, false));
    const d = suyos(rasgos.desafios).map(r => linea(r, true));
    if (f.length === 0 && d.length === 0) return '';
    return `\n\nRASGOS QUE SE LE HAN SACADO DE SU CARTA PARA ESTA AREA:\n\nFORTALEZAS\n${f.join('\n') || '(ninguna)'}\n\nDESAFIOS\n${d.join('\n') || '(ninguno)'}`;
  }

  async function pedirArea(area, rasgos) {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      // Un area tarda entre 20 y 40 segundos. Pasado el minuto y medio no esta
      // tardando: esta colgada, y vale mas cortarla y volver a pedirla.
      signal: reloj.senal(90000),
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-5',
        // EL RAZONAMIENTO, APAGADO.
        //
        // Este modelo razona antes de escribir si no se le dice lo contrario, y
        // ese razonamiento sale del mismo presupuesto de max_tokens y se paga
        // igual que el texto. Para escribir un area no hace falta: el prompt ya
        // dice exactamente que tiene que salir. Encendido, cada area tardaba 45
        // segundos, gastaba los 3.500 tokens en pensar y devolvia el texto vacio.
        thinking: { type: 'disabled' },
        max_tokens: 3500,
        system: SYSTEM_PROMPT,
        messages: [{
          role: 'user',
          content: `${contextoPersona}\n\n${area.prompt}${rasgosDelArea(area, rasgos)}`,
        }],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      const err = new Error(`Error en área ${area.id}: ${response.status} — ${errorText}`);
      err.temporal = response.status === 429 || response.status >= 500;
      throw err;
    }

    const data = await response.json();
    const texto = data.content?.[0]?.text || '';

    if (!texto || texto.trim().length < 100) {
      const err = new Error(`Área ${area.id} devolvió texto vacío o demasiado corto`);
      err.temporal = true;
      throw err;
    }

    return texto.trim();
  }

  async function generarArea(area, rasgos) {
    let ultimoError;
    for (let intento = 1; intento <= INTENTOS_POR_AREA; intento++) {
      try {
        return await pedirArea(area, rasgos);
      } catch (err) {
        ultimoError = err;
        // Un corte de red llega sin marca; se trata como temporal.
        const temporal = err.temporal !== false;
        if (!temporal || intento === INTENTOS_POR_AREA) break;
        console.warn(`Área ${area.id}: intento ${intento} fallido (${err.message.slice(0, 80)}), reintentando`);
        await new Promise(r => setTimeout(r, 1500 * intento));
      }
    }
    throw ultimoError;
  }

  try {
    // LAS LISTAS VAN PRIMERO, Y SOLAS.
    //
    // Antes que las areas, no a la vez: mas adelante las areas se escribiran
    // con los rasgos ya sacados, y para eso tienen que existir antes de que
    // empiece a escribirse ninguna area.
    //
    // Y SIN RED. Si las listas no salen, no sale el informe: se corta aqui, se
    // suelta la reserva y el cliente reintenta. Un informe sin las listas no es
    // el producto, asi que no se entrega a medias.
    // Y con el mismo trato que las areas: cada lista se reintenta hasta 3 veces
    // por su cuenta cuando el fallo es temporal (saturacion, error del
    // servidor, corte de red). Tienen que salir siempre, igual que las areas.
    // Lo que hay en cada casa va SOLO aqui, a las listas de rasgos. El informe
    // de las siete areas recibe el mismo texto de siempre, sin una letra de
    // mas: lo suyo se arma arriba con cartaTexto a secas.
    const cartaConLasCasas = casasTexto ? `${cartaTexto}\n\n${casasTexto}` : cartaTexto;
    const { paraLasAreas, ...rasgos } = await sacarRasgos(nombrePila, sexo, cartaConLasCasas, INTENTOS_POR_AREA, reloj);

    // Despues, las 7 areas a la vez. Cada una recibe SOLO los rasgos que caben
    // en ella; en el PDF salen todos, que eso va por su lado.
    const resultados = await Promise.all(
      AREAS.map(area => generarArea(area, paraLasAreas))
    );

    // Unir con el separador. Es U+001F (Unit Separator), un caracter de
    // control invisible que existe justo para esto y que no aparece en texto
    // escrito. Antes era la palabra "===AREA===": si el modelo la escribia por
    // casualidad dentro de un area, el informe se partia mal y los textos se
    // desplazaban de seccion.
    // Por si acaso, se quita el separador del texto de cada area antes de unir:
    // asi ni escribiendolo a proposito se puede romper el reparto.
    const textoCompleto = resultados
      .map(t => t.split(SEPARADOR_AREAS).join(''))
      .join(SEPARADOR_AREAS);

    // El token viaja al navegador y de ahi a generar-pdf y save-pdf: es lo
    // que demuestra que quien pide el PDF es quien tiene la reserva.
    return res.status(200).json({ texto: textoCompleto, token: reserva.token, rasgos });

  } catch (err) {
    console.error('Error generando áreas:', err.message);
    // Soltar la reserva para que el cliente pueda reintentar en el acto en
    // vez de esperar a que caduque.
    await liberar(stripe, session_id, reserva.token);
    return res.status(500).json({ error: 'Error generando el informe: ' + err.message });
  }
}


// ═════════════════════════════════════════════════════════════════
// LAS DOS LISTAS DE RASGOS
//
// Se piden aparte de las areas, con su propio encargo, y salen UNICAMENTE de
// la carta natal.
//
// CADA RASGO LLEVA DE DONDE SALE.
//
// Un modelo al que se le pide "dime como es esta persona" y ademas se le
// prohibe nombrar planetas y signos se queda sin nada a lo que agarrarse:
// deja de leer la carta y escribe el arquetipo que ya se sabe, el mismo para
// todo el mundo. Obligarle a decir, en cada rasgo, de que posicion concreta
// sale, le devuelve el suelo.
//
// Por eso "origen" es una casilla obligatoria del esquema, y se imprime en el
// PDF para poder revisar si lo que dice es correcto.
// ═════════════════════════════════════════════════════════════════

// Las siete areas del estudio, en el orden en que salen en el informe.
const NOMBRES_DE_AREA = ['IDENTIDAD', 'PATRONES', 'MIEDOS', 'HERIDA', 'AMOR', 'RELACIONES', 'DINERO'];

const CASILLAS_DEL_RASGO = {
  type: 'object',
  properties: {
    nombre:      { type: 'string' },
    descripcion: { type: 'string' },
    causa:       { type: 'string' },
    origen:      { type: 'string' },
  },
  required: ['nombre', 'descripcion', 'causa', 'origen'],
  additionalProperties: false,
};

// UNA CAJA POR AREA, NO UNA LISTA SEGUIDA.
//
// Pidiendo una lista seguida, la rellenaba recorriendo los aspectos, que es lo
// mas largo y concreto que tiene delante, y habia areas a las que no llegaba
// nunca: el Nodo Norte, por ejemplo, no forma ningun aspecto, asi que el area
// que sale de el se quedaba a cero. La regla de "al menos uno de cada" estaba
// escrita y aun asi no se cumplia.
//
// Con una caja por area tiene que pasar por las siete para contestar, y dejar
// una vacia es algo que hace a la vista y no un descuido. El area de cada
// rasgo ya no hace falta preguntarla: es la caja en la que viene.
const ESQUEMA_UNA_LISTA = {
  type: 'object',
  properties: Object.fromEntries(NOMBRES_DE_AREA.map(a => [a, { type: 'array', items: CASILLAS_DEL_RASGO }])),
  required: NOMBRES_DE_AREA,
  additionalProperties: false,
};

// ═════════════════════════════════════════════════════════════════
// A QUE AREA DEL ESTUDIO PERTENECE CADA RASGO
//
// No lo decide el modelo: lo calcula el codigo a partir de la posicion de la
// carta de la que sale el rasgo, que es lo que el modelo escribe en la casilla
// "origen". Asi el area siempre es la misma para la misma posicion, y no
// depende de que acierte al elegir.
//
// El reparto es el estandar en astrologia: cada casa es una parcela de la vida
// y cada planeta una funcion, y cada una cae en el area del estudio que habla
// de eso mismo.
// ═════════════════════════════════════════════════════════════════

// Las doce casas: cada una es una parcela de la vida.
const AREA_DE_LA_CASA = {
  1:  'IDENTIDAD',   // quien eres y como te presentas
  2:  'DINERO',      // tu dinero, lo que posees, lo que vales
  3:  'RELACIONES',  // comunicacion y entorno cercano
  4:  'HERIDA',      // hogar, raices, familia
  5:  'AMOR',        // romance, placer, lo que disfrutas
  6:  'PATRONES',    // rutinas y trabajo del dia a dia
  7:  'AMOR',        // pareja y asociaciones
  8:  'DINERO',      // lo que se comparte con otro
  9:  'PATRONES',    // creencias y lo que da por cierto
  10: 'DINERO',      // carrera y lo que hace de puertas afuera
  11: 'RELACIONES',  // amigos y grupos
  12: 'MIEDOS',      // lo inconsciente y lo que no se ve
};

// Los planetas y puntos: cada uno es una funcion.
const AREA_DEL_CUERPO = {
  sol:        'IDENTIDAD',   // identidad y vitalidad
  ascendente: 'IDENTIDAD',   // como se muestra
  nodo:       'PATRONES',    // lo que repite y hacia donde no va
  luna:       'HERIDA',      // emociones y raices
  quiron:     'HERIDA',      // la herida
  saturno:    'MIEDOS',      // limites y exigencia
  neptuno:    'MIEDOS',      // lo que se disuelve y confunde
  pluton:     'MIEDOS',      // poder y lo que se esconde
  venus:      'AMOR',        // amor y lo que atrae
  marte:      'AMOR',        // deseo y empuje
  mercurio:   'RELACIONES',  // comunicacion
  urano:      'RELACIONES',  // ruptura y grupos
  jupiter:    'DINERO',      // expansion y abundancia
};

// Los doce signos, por si el origen nombra un signo y ningun cuerpo ni casa.
// Cada signo va al area de su planeta regente, que es el estandar.
const AREA_DEL_SIGNO = {
  aries:       'AMOR',        // regido por Marte
  tauro:       'AMOR',        // Venus
  geminis:     'RELACIONES',  // Mercurio
  cancer:      'HERIDA',      // Luna
  leo:         'IDENTIDAD',   // Sol
  virgo:       'RELACIONES',  // Mercurio
  libra:       'AMOR',        // Venus
  escorpio:    'MIEDOS',      // Pluton
  sagitario:   'DINERO',      // Jupiter
  capricornio: 'MIEDOS',      // Saturno
  acuario:     'RELACIONES',  // Urano
  piscis:      'MIEDOS',      // Neptuno
};

// De mas personal a mas lejano. Cuando un rasgo sale de un aspecto entre dos
// cuerpos, manda el mas personal: los de fuera tiñen a los de dentro, pero el
// rasgo se vive en la parcela del de dentro.
const ORDEN_PERSONAL = ['sol','luna','mercurio','venus','marte','ascendente','nodo',
                        'jupiter','saturno','quiron','urano','neptuno','pluton'];

// Diez de los trece cuerpos tienen area propia y no se discute: el Sol es la
// identidad, la Luna y Quiron la herida, Venus el amor, Saturno el miedo.
//
// Estos tres no. Marte coge su area de Venus, Urano de la casa once y Jupiter
// de la casa dos: es un area prestada, no suya. Por eso, cuando el origen dice
// en que casa estan, manda la casa, que si dice de que parcela de la vida
// habla el rasgo.
const AREA_PRESTADA = ['marte', 'urano', 'jupiter'];

function sinTildes(txt) {
  return String(txt || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

// La primera casa que nombra el origen, si es una de las doce.
function casaQueNombra(t) {
  const m = t.match(/casa\s*(\d{1,2})/);
  return m ? (AREA_DE_LA_CASA[Number(m[1])] || '') : '';
}

// La casa que el origen pone junto a un cuerpo concreto: se mira solo el tramo
// que va desde su nombre hasta el siguiente cuerpo que se nombre, para no
// cogerle la casa al otro.
function casaEnElTramo(t, cuerpo) {
  const desde = t.search(new RegExp('\\b' + cuerpo + '\\b'));
  if (desde < 0) return '';
  const siguientes = ORDEN_PERSONAL
    .filter(c => c !== cuerpo)
    .map(c => t.slice(desde + 1).search(new RegExp('\\b' + c + '\\b')))
    .filter(i => i >= 0);
  const hasta = siguientes.length > 0 ? desde + 1 + Math.min(...siguientes) : t.length;
  return casaQueNombra(t.slice(desde, hasta));
}

// Todas las areas que hay DE VERDAD en una posicion de la carta. Una posicion
// suele tocar dos o tres: "Venus trigono Jupiter" es amor por Venus y dinero
// por Jupiter, y las dos son ciertas.
function areasQueHayEn(origen) {
  const t = sinTildes(origen);
  const dentro = new Set();
  for (const c of ORDEN_PERSONAL) {
    if (new RegExp('\\b' + c + '\\b').test(t)) dentro.add(AREA_DEL_CUERPO[c]);
  }
  for (const m of t.matchAll(/casa\s*(\d{1,2})/g)) {
    const a = AREA_DE_LA_CASA[Number(m[1])];
    if (a) dentro.add(a);
  }
  return dentro;
}

// El area de un rasgo. La elige el modelo, porque es el unico que sabe de que
// va el rasgo: la misma posicion sirve para dos areas y solo lo escrito decide
// cual. Pero solo se le acepta si esa area esta de verdad en su posicion, asi
// que no puede colocarlo donde le venga bien. Si no la dice, o si la que dice
// no esta ahi, decide la posicion como hasta ahora.
function areaDelRasgo(origen, elegida) {
  if (elegida && areasQueHayEn(origen).has(elegida)) return elegida;
  return areaPorLaPosicion(origen);
}

// Lee la casilla "origen" y devuelve el area. Si no reconoce nada, devuelve ''
// y el PDF simplemente no pinta el area de ese rasgo.
function areaPorLaPosicion(origen) {
  const t = sinTildes(origen);

  // Los cuerpos que nombra, en orden de mas personal a mas lejano.
  const cuerpos = ORDEN_PERSONAL.filter(c => new RegExp('\\b' + c + '\\b').test(t));
  if (cuerpos.length > 0) {
    const cuerpo = cuerpos[0];
    if (AREA_PRESTADA.includes(cuerpo)) {
      // Primero la casa que va con ESE cuerpo: la que aparece desde su nombre
      // hasta que el origen empieza a hablar de otro.
      const suya = casaEnElTramo(t, cuerpo);
      if (suya) return suya;
      // Y si no la dice pegada a el, la unica casa que nombre el origen.
      const otra = casaQueNombra(t);
      if (otra) return otra;
    }
    return AREA_DEL_CUERPO[cuerpo];
  }

  // Si no nombra ningun cuerpo pero si una casa, vale la casa.
  const casa = casaQueNombra(t);
  if (casa) return casa;

  // Y si solo nombra un signo, vale el signo.
  const signo = Object.keys(AREA_DEL_SIGNO).find(g => new RegExp('\\b' + g).test(t));
  if (signo) return AREA_DEL_SIGNO[signo];

  return '';
}

async function pedirUnaLista(cual, nombrePila, sexo, cartaTexto, soloEstas, aReescribir, reloj) {
  const trato = sexo === 'mujer'
    ? 'una MUJER. Todo en femenino.'
    : sexo === 'hombre'
      ? 'un HOMBRE. Todo en masculino.'
      : 'una persona que no se identifica como hombre ni como mujer. Evita marcar el genero en los adjetivos.';

  const encargo = `Eres astrologa. Lees una carta natal y sacas una lista de rasgos de esa persona.

TODO SALE DE LA CARTA. No hay ninguna otra fuente. Si algo no se puede sacar de una posicion concreta de esta carta, no se escribe.


1. QUE LISTA TE TOCA

${cual === 'fortalezas'
  ? 'FORTALEZAS: lo que se le da bien, sus dones, sus ventajas, lo que hace bien sin darse cuenta.'
  : 'DESAFIOS: lo que le cuesta, lo que le pesa, donde tropieza.'}

Solo esa. La otra lista la esta sacando otra persona a la vez que tu.


2. CUANTOS

Veinte como maximo en TODA la lista, sumando las siete areas, no en cada una. Es un TECHO, no un objetivo ni una cuota que llenar: si de esta carta salen dieciocho de verdad, se entregan dieciocho. No se añade ninguno para llegar a la cifra y no se parte uno bueno en dos.
Si te salieran mas de veinte, te quedas con los que mas peso tienen en esta carta.

${cual === 'fortalezas'
  ? 'Y AL MENOS DOS EN CADA AREA. Ninguna caja se entrega vacia ni con uno solo: de todo el mundo se pueden decir dos cosas buenas de cada parcela de su vida, asi que de cada area salen dos como minimo.'
  : 'Y AL MENOS DOS EN CADA AREA. Ninguna caja se entrega vacia ni con uno solo: en los desafios es donde esta lo que mas le sirve, asi que de cada area salen dos como minimo.'}
Pero ojo: dos es el suelo, no la respuesta. De cada area sale TODO lo que de verdad haya en su parte de la carta, que en unas seran cuatro y en otras el minimo. Poner dos en cada caja y darlo por hecho es entregar media lista.

Y NI UNO REPETIDO, tampoco entre areas distintas. Repetido no es solo la misma frase: es la misma cosa dicha de otra manera. Si un rasgo te vale para dos areas, va en UNA sola, en la que mas pese. Antes de entregar, lee las siete cajas juntas y quita lo que diga lo mismo que otro.


3. DE DONDE LOS SACAS

Recorre la carta ENTERA, no solo lo que mas salta a la vista. Quedarse en lo evidente deja fuera la mitad de la persona.

El estudio tiene siete areas y la carta habla de las siete. Contestas con una caja por area, asi que vas una por una: te paras en un area, miras lo que hay de ella en ESTA carta, sacas sus rasgos, y solo entonces pasas a la siguiente.

No empieces por la lista de aspectos. Es lo mas largo que tienes delante y arrastra: se llena la lista con lo que sale de ahi y hay areas a las que no llegas nunca. Se empieza por el area y se busca lo suyo, que a veces es un aspecto y a veces no.

Esto es lo que hay de cada area:

IDENTIDAD    el Sol, el Ascendente, la casa 1
PATRONES     el Nodo Norte, las casas 6 y 9
MIEDOS       Saturno, Neptuno, Pluton, la casa 12
HERIDA       la Luna, Quiron, la casa 4
AMOR         Venus, las casas 5 y 7
RELACIONES   Mercurio, las casas 3 y 11
DINERO       las casas 2, 8 y 10

En cada una miras todo lo que tienes de eso: en que signo esta y en que casa cae, que aspectos forma con los demas, si va retrogrado, y si ahi se junta mas de una cosa o la casa esta vacia. Cada dato dice algo distinto.

Y EL SIGNO Y LA CASA TIENEN QUE CAMBIAR LO QUE ESCRIBES, no solo lo que pones en "origen". Un mismo cuerpo en dos signos distintos no da el mismo rasgo, y en dos casas distintas tampoco: el cuerpo dice QUE le pasa, el signo dice DE QUE MANERA le pasa y la casa dice EN QUE PARTE DE SU VIDA le pasa. Si te quedas en lo que ese cuerpo significa en general, escribes lo mismo que le escribirias a cualquiera, porque ese cuerpo lo tiene todo el mundo. Lo que no tiene todo el mundo es este cuerpo en este signo, en esta casa y con estos aspectos.
LA PRUEBA: si le cambiaras el signo o la casa a esa posicion y el rasgo que has escrito siguiera valiendo igual, es que no lo has escrito de ESTA carta y hay que escribirlo otra vez.

Marte, Urano y Jupiter no llevan area propia: lo que salga de ellos es del area de la casa en la que estan.
Un rasgo va en la caja del area de la que lo has sacado, y esa area tiene que estar de verdad en la posicion que escribas en "origen".


4. LAS CUATRO CASILLAS DE CADA RASGO

nombre       Se le habla de tu, igual que en todo lo demas: es lo que hace
             o lo que le pasa, dicho a la persona. No el nombre de eso.
             Un nombre que arranca con un sustantivo y le cuelga adjetivos
             detras no le habla a nadie, es una etiqueta de manual, y esta mal
             aunque describa bien el rasgo.
             De cuatro a siete palabras, con sus articulos y sus preposiciones,
             como se habla. Empieza en mayuscula, y sin punto al final.

descripcion  TRES RENGLONES COMO MUCHO, que son unos doscientos sesenta
             caracteres contando los espacios. No se cuentan frases: dos frases
             pueden ocupar cinco renglones. Que hace, que le pasa, como se le
             nota y en que parte de su vida se le nota.

causa        Por que le pasa ESE rasgo en concreto y de donde le viene, que es
             lo que quiere saber. Dos o tres frases.
             ABRE NOMBRANDO LA CAUSA, no describiendo otra vez lo que le pasa:
             "esto sale porque...", "esto viene de que...", "lo que hay detras
             es que...". Abrir con lo que hace o lo que siente es lo que hace
             que la causa acabe siendo el rasgo dicho de otra manera.
             NO REPITE EL RASGO CON OTRAS PALABRAS. Lo que hace y como se le
             nota ya esta arriba, en la descripcion. Aqui se dice que hay
             DETRAS que lo produce, el mecanismo del que sale.
             DONDE NO PUEDE FALLAR NI UNA ES EN LOS DESAFIOS.
             Y EL FALLO TIPICO, en las dos listas, es escribir "se le da bien
             porque le importa", "porque se exige", "porque su cabeza funciona
             asi" o "porque le sale natural": eso es el rasgo otra vez con un
             porque delante, y no explica nada. Lo que produce un rasgo nunca
             es el rasgo. Es una manera suya de funcionar que por si sola no
             es ni buena ni mala, y que acaba dando esto.
             PRUEBA ANTES DE ENTREGAR: tapa la descripcion y lee solo la
             causa. Si ahi no hay nada que no estuviera ya en la descripcion,
             esa causa no vale y se escribe la de verdad.
             Y tiene que ser la de ESTE rasgo, no una que valdria igual para
             cualquier otro suyo.
             NI UNA PALABRA TECNICA, y aqui es donde mas se cuela. Ni en el
             nombre, ni en la descripcion, ni aqui: ningun planeta, ningun
             signo, ninguna casa, ningun aspecto, nada de que algo esta en una
             zona de su carta ni de que va retrogrado, y su carta no se nombra.
             Tampoco se nombra el area del estudio de la que sale el rasgo: eso
             es cosa nuestra para ordenarlo, no algo que tenga que leer.
             La posicion va en "origen", la casilla de al lado, y no se cuenta
             dos veces. Aqui se explica el mecanismo con sus palabras,
             sin decir de donde has sacado que funciona asi.
             Y OJO CON ESTO: una carta natal es el mapa del momento en que
             nacio, asi que lo que sale de ella lo tiene de nacimiento. Por eso
             no se dice que lo aprendio de pequeña, ni que se lo enseñaron en
             casa, ni que le viene de sus padres, ni se cuenta ningun episodio
             de su vida: eso no esta en la carta y seria inventarselo.
             Lo que SI esta en la carta es la parcela de su vida en la que se
             le nota: la casa en la que cae la posicion dice si es su trabajo,
             su dinero, su pareja, su gente, su casa, su cabeza o su cuerpo.
             Esa parcela se dice, con la palabra de siempre y sin nombrar la
             casa. Sin ella el rasgo se queda en como funciona por dentro, que
             es igual en todo el mundo, y quien lo lee no se reconoce en nada.

origen       De donde sale el rasgo en la carta, en tecnico y en corto: el
             cuerpo con su signo y su casa, o los dos cuerpos y el aspecto que
             forman. Nada mas: ni explicacion ni frase.
             Es obligatoria. Y no repartas todos los rasgos sobre las mismas
             dos o tres posiciones: la carta tiene de sobra.

Un rasgo son sus cuatro casillas escritas de verdad. Si empiezas uno y no sabes como seguirlo, se quita ENTERO, tambien su nombre. Nunca se rellena una casilla con una palabra de relleno ni con un aviso de que falta: eso se imprime tal cual en el informe que va a leer.


5. COMO SE ESCRIBE

Esto lo lee una persona normal, que no ha estudiado nada de esto y que lo lee una sola vez.

- SE ENTIENDE A LA PRIMERA. Si una frase obliga a volver atras para entenderla, esta mal escrita y se cambia. Esa prueba manda sobre lo bonito que quede.
- SE LE HABLA DE TU, siempre, como quien se lo cuenta tomando un cafe. Nunca en tercera persona.
- SE CUENTA LO QUE LE PASA EN SU VIDA: lo que hace, lo que piensa, lo que siente, lo que le ocurre un dia cualquiera.
- Y SE LE PONE SU VOZ: lo que ella se dice por dentro cuando le pasa eso, dicho con las palabras que usaria ella y no con las de quien la observa. Eso es lo que hace que se reconozca. Sale de lo que dice el rasgo, no de suponerle nada: no se le inventa ningun hecho, ninguna escena ni ninguna frase que no se desprenda de lo que ya se ha contado.
- NO SE HABLA DE PARTES SUYAS COMO SI FUERAN COSAS CON VIDA PROPIA que se mueven, chocan, se construyen o se mezclan. Se dice lo que hace la persona, no lo que hace un concepto.
- Y POR ESO NO SE ESCRIBE "tu manera de", "tu forma de", "tu capacidad de", "una necesidad de", "una tendencia a", "una parte de ti" ni "la parte de ti que". Convierten en cosa lo que ella hace, y quien lee tiene que volver atras para entenderlo. Donde salga uno de esos, se dice con un verbo lo que hace ella.
- NI DOS NOMBRES NI DOS DESCRIPCIONES QUE EMPIECEN IGUAL. Antes de entregar, lee en columna los nombres de toda la lista, y luego las descripciones: los que arranquen con la misma palabra se escriben otra vez arrancando de otra manera.
- NADA DE METAFORAS NI IMAGENES. Se dice la cosa, no una figura de la cosa.
- FRASES LARGAS, ENCADENADAS CON COMAS, y QUE EL TEXTO RESPIRE. Asi se habla de verdad. Cortarlo todo en frases secas y en ideas cortas una detras de otra parte la lectura, suena a lista y ahoga a quien lee, porque no le da tiempo a asimilar una cuando ya le llega la siguiente. Se desarrolla una idea, se le deja sitio, y luego viene la otra.
- LAS PALABRAS SON LAS DE LA CALLE, no las de un informe. Si una palabra la verias antes en una evaluacion de trabajo o en un manual que en una conversacion, se cambia por la que usaria cualquiera hablando.
- CUANDO ALGO SE LE DA BIEN, SE LE DICE A LA CARA. Se le reconoce directamente, no se describe su rendimiento desde fuera como si se la estuviera puntuando.
- CUANDO ES UN DESAFIO, SE LE CUENTA SIN ATACARLA. Se dice lo que le pasa de manera que lo reconozca y no se ponga a la defensiva: sin juzgarla, sin señalarla y sin que suene a reproche ni a defecto.
- Español de España, hablado, sin latinoamericanismos.
- Nada de asteriscos, negritas, guiones ni simbolos: es texto corrido.
${cual === 'desafios'
  ? '- No se le pone un diagnostico: se cuenta lo que le ocurre, no como se llama eso.'
  : ''}

Carta natal:
${cartaTexto}

Persona: ${trato}
Nombre de pila: ${nombrePila}`;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    // Una lista tarda menos de un minuto. Pasados cien segundos no esta
    // tardando: esta colgada, y el reintento hace mas que seguir esperando.
    signal: reloj.senal(100000),
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-5',
      // Igual que las areas: sin razonamiento. Ver el comentario de pedirArea.
      thinking: { type: 'disabled' },
      // Sin tope de rasgos, la lista puede ser larga. Si la respuesta se corta,
      // el JSON no se puede leer y se pierden las DOS listas enteras, asi que
      // el techo va holgado. Es un techo, no un objetivo: solo se paga lo que
      // el modelo escribe.
      max_tokens: 16000,
      system: encargo,
      output_config: { format: { type: 'json_schema', schema: ESQUEMA_UNA_LISTA } },
      messages: [{ role: 'user', content:
        aReescribir && aReescribir.length > 0
          ? [`Estos ${cual} que has sacado de esta carta le nombran la carta a la persona que lo lee, y eso no puede salir en el informe. Devuelvemelos otra vez, cada uno en la caja de su area, con el MISMO nombre y el MISMO origen, cambiando solo la frase que nombra la carta por lo que le pasa a ella con sus palabras. Las demas cajas las dejas vacias.`, '']
              .concat(aReescribir.map(r => `- area: ${r.area}\n  nombre: ${r.nombre}\n  descripcion: ${r.descripcion}\n  causa: ${r.causa}\n  origen: ${r.origen}`))
              .join('\n')
          : soloEstas && soloEstas.length > 0
            ? `De esta carta faltan ${cual} de estas areas: ${soloEstas.join(', ')}. Sacalos ahora, siguiendo el esquema. Las demas cajas las dejas vacias.`
            : `Saca la lista de ${cual} de esta carta, siguiendo el esquema.` }],
    }),
  });

  if (!response.ok) {
    const detalle = await response.text();
    const err = new Error(`${cual}: ${response.status} — ${detalle.slice(0, 300)}`);
    // Igual que en las areas: la saturacion y los errores del servidor se
    // reintentan; una peticion mal formada o la clave mal no van a mejorar.
    err.temporal = response.status === 429 || response.status >= 500;
    throw err;
  }

  const data = await response.json();
  const texto = (data.content || [])
    .filter(b => b && typeof b.text === 'string')
    .map(b => b.text)
    .join('');

  let salida;
  try {
    salida = JSON.parse(texto);
  } catch (e) {
    const err = new Error(`${cual}: la respuesta no es JSON valido`);
    err.temporal = true;
    throw err;
  }

  // Las siete cajas se juntan otra vez en una lista, en el orden de las areas,
  // que es como se pintan en el PDF. De ahi para adelante nada cambia.
  //
  // Si a un rasgo le faltara una casilla, se queda vacia. Sin esto se imprimia
  // en el PDF la palabra "undefined", que es lo mismo que paso con la palabra
  // "placeholder".
  const lista = [];
  for (const area of NOMBRES_DE_AREA) {
    for (const r of (Array.isArray(salida[area]) ? salida[area] : [])) {
      const origen = String(r?.origen ?? '').trim();
      lista.push({
        nombre: String(r?.nombre ?? '').trim(),
        descripcion: String(r?.descripcion ?? '').trim(),
        causa: String(r?.causa ?? '').trim(),
        origen,
        // La caja dice de que area es, pero solo se le hace caso si esa area
        // esta de verdad en la posicion de la que sale el rasgo.
        area: areaDelRasgo(origen, area),
      });
    }
  }
  return lista;
}

// CADA LISTA SE REINTENTA POR SU CUENTA, igual que cada area.
//
// Si falla la de desafios, se vuelve a pedir solo esa: la de fortalezas ya
// estaba bien y no se tira ni se paga dos veces. Es exactamente lo que hace
// generarArea con cada una de las siete areas.
async function sacarUnaLista(cual, nombrePila, sexo, cartaTexto, INTENTOS, reloj) {
  let ultimoError;
  for (let intento = 1; intento <= INTENTOS; intento++) {
    try {
      return await pedirUnaLista(cual, nombrePila, sexo, cartaTexto, null, null, reloj);
    } catch (err) {
      ultimoError = err;
      // Un corte de red llega sin marca; se trata como temporal.
      const temporal = err.temporal !== false;
      if (!temporal || intento === INTENTOS) break;
      console.warn(`Lista de ${cual}: intento ${intento} fallido (${err.message.slice(0, 80)}), reintentando`);
      await new Promise(r => setTimeout(r, 1500 * intento));
    }
  }
  throw ultimoError;
}

// LO QUE LA CLIENTA NO PUEDE LEER.
//
// El encargo prohibe las palabras de astrologia en el nombre, la descripcion y
// la causa, y aun asi se le cuelan: en un informe de prueba tres rasgos decian
// "en la zona mas escondida de tu carta" o "tu manera de querer esta colocada
// en una zona de la carta". Pedirlo no basta, asi que se comprueba.
//
// Solo se buscan las palabras que en castellano no significan otra cosa. "Casa",
// "carta" y "aspecto" sueltas se usan a diario ("en casa se comporta distinto",
// "cuida su aspecto"), asi que solas no cuentan: se buscan pegadas a lo que las
// hace tecnicas. Cancer, Leo y Libra tampoco entran, que son enfermedad, verbo
// y verbo. Se cuela alguna asi, pero no se tira ni un rasgo bueno.
const PALABRAS_DE_ASTROLOGIA = [
  /\b(mercurio|jupiter|saturno|urano|neptuno|pluton|quiron|ascendente)\b/,
  /\bnodo (norte|sur)\b/,
  /\b(aries|tauro|geminis|virgo|escorpio|sagitario|capricornio|acuario|piscis)\b/,
  // Cancer, Leo y Libra son enfermedad y dos verbos, asi que sueltas no cuentan:
  // se buscan como se nombra un signo, detras de "en".
  /\ben (cancer|leo|libra)\b/,
  /\b(tu|su|la|mi) carta\b/,
  /\b(carta|mapa) (natal|astral)\b/,
  /\bretrograd[oa]\b/,
  /\bcasa \d{1,2}\b/,
  /\b(conjuncion|oposicion|cuadratura|trigono|sextil) (a|con|al)?\s*(el|la)?\s*(mercurio|jupiter|saturno|urano|neptuno|pluton|quiron|sol|luna|venus|marte)\b/,
  // "aspecto" y "signo" solas son palabras corrientes, asi que se buscan solo
  // pegadas a lo que las convierte en tecnicas.
  /\bsin (ningun )?aspecto/,
  /\baspectos? (que (conect|sostien|un|enlac)|entre)/,
  /\b(tu|su) (sol|luna|venus|marte|mercurio|jupiter|saturno|signo)\b/,
  /\b(los|tus|sus) planetas\b/,
  /\b(zodiaco|horoscopo|astrolog|efemerides)\b/,
];

function hablaDeAstrologia(rasgo) {
  const texto = sinTildes(`${rasgo.nombre} ${rasgo.descripcion} ${rasgo.causa}`);
  return PALABRAS_DE_ASTROLOGIA.some(re => re.test(texto));
}

// UN RASGO BUENO NO SE TIRA POR UNA FRASE.
//
// Un rasgo puede estar bien entero y tener una sola frase que nombra la carta.
// Tirarlo seria perder lo bueno, asi que se le devuelven esos rasgos y se le
// pide que reescriban SOLO esa frase, con el mismo nombre y el mismo origen.
// Si alguno vuelve nombrandola otra vez, ese si se cae.
async function sinNombrarLaCarta(cual, nombrePila, sexo, cartaTexto, lista, reloj) {
  const sucios = lista.filter(hablaDeAstrologia);
  if (sucios.length === 0) return lista;

  // Esto solo pule. Si no quedan tiempo para esta llamada y para todo lo que
  // viene detras, se deja: el filtro de mas abajo quita esos rasgos y el
  // informe sale. Perder un rasgo es menos malo que perder el informe.
  if (!reloj.hayTiempoPara(190)) {
    console.warn(`Lista de ${cual}: ${sucios.length} rasgos nombraban la carta, no da tiempo a reescribirlos`);
    return lista;
  }

  console.warn(`Lista de ${cual}: ${sucios.length} rasgos nombraban la carta, se piden reescritos`);
  let arreglados;
  try {
    arreglados = await pedirUnaLista(cual, nombrePila, sexo, cartaTexto, null, sucios, reloj);
  } catch (err) {
    console.error(`Lista de ${cual}: no se pudo reescribir: ${err.message.slice(0, 80)}`);
    return lista;
  }

  // Cada uno vuelve a su sitio por el nombre, que es lo que se le ha pedido que
  // no cambie. El que no vuelva, o vuelva igual de sucio, se queda como estaba
  // y lo quita el filtro de mas abajo.
  const porNombre = new Map(arreglados.filter(r => !hablaDeAstrologia(r)).map(r => [r.nombre, r]));
  return lista.map(r => (hablaDeAstrologia(r) && porNombre.has(r.nombre)) ? porNombre.get(r.nombre) : r);
}

// EL MINIMO POR AREA, GARANTIZADO.
//
// El esquema obliga a que existan las siete cajas, pero no puede obligar a que
// lleven algo dentro: la API no admite pedir un minimo por caja. Asi que lo
// comprueba el codigo. Si alguna area no llega al minimo se piden SOLO esas,
// una vez, y se juntan con lo que ya habia. Cuando el minimo se cumple, que es
// lo normal, esto no gasta ni una llamada.
const MINIMO_POR_AREA = { fortalezas: 2, desafios: 2 };

async function conElMinimoPorArea(cual, nombrePila, sexo, cartaTexto, listaCruda, reloj) {
  // Fuera los que nombran la carta a la clienta. Si al quitarlos algun area se
  // queda corta, el relleno de aqui abajo la vuelve a pedir; no hace falta
  // ninguna llamada nueva para esto.
  const lista = listaCruda.filter(r => !hablaDeAstrologia(r));
  if (lista.length < listaCruda.length) {
    console.warn(`Lista de ${cual}: ${listaCruda.length - lista.length} rasgos nombraban la carta a la clienta, se quitan`);
  }

  const minimo = MINIMO_POR_AREA[cual] || 1;
  const faltan = NOMBRES_DE_AREA.filter(a => lista.filter(r => r.area === a).length < minimo);
  if (faltan.length === 0) return lista;

  // Igual que la reescritura: si no cabe esta llamada y las siete areas
  // detras, se entrega el area corta antes que quedarse sin informe.
  if (!reloj.hayTiempoPara(110)) {
    console.warn(`Lista de ${cual}: no llega al minimo en ${faltan.join(', ')}, no da tiempo a completarlo`);
    return lista;
  }

  console.warn(`Lista de ${cual}: no llega al minimo en ${faltan.join(', ')}, se piden aparte`);
  try {
    const extra = await pedirUnaLista(cual, nombrePila, sexo, cartaTexto, faltan, null, reloj);
    return lista.concat(extra.filter(r => faltan.includes(r.area) && !hablaDeAstrologia(r)));
  } catch (err) {
    // Si esta segunda peticion falla, se entrega lo que ya habia: vale mas el
    // informe con un area corta que sin listas.
    console.error(`Lista de ${cual}: no se pudo completar el minimo: ${err.message.slice(0, 80)}`);
    return lista;
  }
}

// LO QUE SE COMPRUEBA CONTANDO, NO OPINANDO.
//
// El encargo pide que se le hable de tu y aun asi se cuela alguno en tercera
// persona. Eso no es criterio: se cuenta y se ve.
//
// El nombre largo NO se toca. Se probo pedir uno nuevo cuando pasaba de siete
// palabras y salio peor: los que volvian eran cortos pero no se entendian a la
// primera, etiquetas del tipo "Fiable en el trabajo silencioso" en vez de algo
// que le hable a ella. Un titulo de mas se lee; uno que no se entiende, no.
//
// Un nombre que empieza por "Le cuesta" habla de la persona en vez de hablarle
// a ella. Pero "Le sacas partido" esta bien: el verbo en segunda persona acaba
// en ese. Por eso se mira el verbo, no el "le".
function nombreEnTercera(nombre) {
  const t = sinTildes(nombre).trim();
  const le = t.match(/^(se le|le)\s+([a-zñ]+)/);
  if (le && !le[2].endsWith('s')) return true;
  return /^(ella|su)\s/.test(t);
}

// Devuelve por que no vale ese nombre, o cadena vacia si vale.
function nombreQueNoVale(rasgo) {
  const nombre = String(rasgo.nombre || '').trim();
  if (!nombre) return '';
  if (nombreEnTercera(nombre)) return 'habla de el en vez de hablarle a el';
  return '';
}

// DOS RASGOS CON EL MISMO TITULO SON EL MISMO RASGO DICHO DOS VECES.
//
// El mismo titulo puede salir dos veces, en dos areas distintas y contando lo
// mismo. El paso que quita los que se pisan no lo caza, y es lo primero que ve
// quien lo lee.
//
// Esto no es criterio, es comparar dos cadenas, asi que lo hace el codigo y no
// se le pregunta a nadie. Se compara en minusculas, sin tildes y sin
// puntuacion, y solo cuando el titulo es EL MISMO: dos titulos parecidos pueden
// ser dos rasgos distintos, y quitar uno bueno es peor que dejar uno repetido.
// Se queda el primero, que es el del area que va antes en el informe.
function comoSeCompara(titulo) {
  return sinTildes(titulo).replace(/[^a-z0-9ñ ]/g, ' ').replace(/\s+/g, ' ').trim();
}

// Las palabras que no dicen nada. Sin ellas, dos titulos que solo se
// diferencian en un "que" o un "en" se ven por lo que son: el mismo.
const PALABRAS_SIN_PESO = new Set([
  'a', 'al', 'ante', 'como', 'con', 'cuando', 'de', 'del', 'desde', 'donde',
  'el', 'ella', 'en', 'entre', 'es', 'esa', 'ese', 'esta', 'este', 'hasta',
  'la', 'las', 'lo', 'los', 'mas', 'me', 'mi', 'mis', 'muy', 'ni', 'no', 'o',
  'para', 'pero', 'por', 'que', 'se', 'si', 'sin', 'sobre', 'solo', 'su',
  'sus', 'tan', 'te', 'ti', 'tu', 'tus', 'un', 'una', 'uno', 'y', 'ya',
]);

function palabrasConPeso(titulo) {
  return new Set(comoSeCompara(titulo).split(' ').filter(p => p && !PALABRAS_SIN_PESO.has(p)));
}

// DOS TITULOS QUE SON EL MISMO RASGO.
//
// Antes solo se veian los identicos letra por letra. En el informe 116 salieron
// "te cuesta pedir lo que NECESITAS en pareja" y "te cuesta pedir lo que
// QUIERES en pareja": el mismo rasgo con una palabra cambiada, y paso. En el
// 112 paso lo mismo con "aguantas la PRESION mejor que la mayoria" y "aguantas
// la INCERTIDUMBRE mejor que la mayoria".
//
// Son el mismo cuando tienen las mismas palabras con peso salvo una. Se exige
// que sean las MISMAS CUANTAS a proposito, para no confundir dos rasgos
// distintos que empiezan igual: "te cuesta soltar el control cuando algo no
// depende de ti" y "te cuesta soltar el control sobre tus finanzas
// compartidas" comparten tres palabras, no son el mismo rasgo, y con esta
// cuenta no se tocan.
function esElMismoTitulo(a, b) {
  if (a.size !== b.size || a.size < 3) return false;
  let comunes = 0;
  for (const p of a) if (b.has(p)) comunes++;
  return comunes >= a.size - 1;
}

function sinTituloRepetido(fortalezas, desafios) {
  const vistos = [];
  const cribar = lista => lista.filter(r => {
    const t = comoSeCompara(r && r.nombre);
    if (!t) return true;
    const palabras = palabrasConPeso(r.nombre);
    if (vistos.some(v => v.texto === t || esElMismoTitulo(v.palabras, palabras))) {
      console.warn(`Se quita un rasgo con el titulo repetido: ${r.nombre}`);
      return false;
    }
    vistos.push({ texto: t, palabras });
    return true;
  });
  // Las fortalezas primero, que es el orden en que van en el informe.
  return [cribar(fortalezas), cribar(desafios)];
}

// EL AREA LA DECIDE LO QUE DICE EL RASGO, NO DE DONDE SALIO.
//
// Al escribirlos area por area, cada rasgo se queda en la caja donde nacio
// aunque acabe hablando de otra cosa: "encajas con naturalidad en cualquier
// grupo" salio trabajando IDENTIDAD, porque venia del Sol, y se quedo ahi
// aunque hable de gente. Nadie le preguntaba despues de que habla.
//
// Aqui se le pregunta. Se le pasan SOLO los rasgos escritos, sin la carta y
// sin las posiciones, para que no pueda dejarse llevar por el planeta del que
// salieron: lo unico que puede mirar es lo que dice el rasgo.
const QUE_CUBRE_CADA_AREA = `IDENTIDAD    quien es por dentro y por que es como es
PATRONES     lo que repite una y otra vez sin poder parar
MIEDOS       lo que teme y lo que evita, y como eso gobierna su vida sin que lo sepa
HERIDA       lo que le duele A EL, por dentro, y hoy sigue frenandole
AMOR         como quiere, como le quieren, a quien atrae
RELACIONES   como le va CON LOS DEMAS: como los trata, como le tratan, que papel ocupa
DINERO       el dinero, lo material, lo que vale su trabajo Y lo que comparte con otros

DONDE MAS SE FALLA, y como se decide:
- Si el rasgo va de OTRA GENTE (leerlos, caerles bien, calmarlos, hablar con ellos,
  el ambiente que hay con ellos) es RELACIONES, aunque haya emocion de por medio y
  aunque esa gente sea su familia. HERIDA es lo que le duele a EL, no lo que percibe
  de los demas.
- Si el rasgo va de dinero, bienes, herencias, deudas o de lo que es de dos, es
  DINERO, aunque lo que cuente sea el miedo a perderlo o las ganas de controlarlo.
- MIEDOS solo cuando el rasgo no cae en una parcela concreta. Si hay parcela
  (dinero, pareja, gente, casa), manda la parcela.
- Que le hayan hecho daño, o que le cueste reconocerlo, es HERIDA, no MIEDOS.`;

const ESQUEMA_AREAS = {
  type: 'object',
  properties: {
    areas: { type: 'array', items: { type: 'string' } },
    sobran: { type: 'array', items: { type: 'integer' } },
    nombres: {
      type: 'array',
      items: {
        type: 'object',
        properties: { numero: { type: 'integer' }, nombre: { type: 'string' } },
        required: ['numero', 'nombre'],
        additionalProperties: false,
      },
    },
    masPeso: { type: 'array', items: { type: 'integer' } },
  },
  required: ['areas', 'sobran', 'nombres', 'masPeso'],
  additionalProperties: false,
};

async function porLoQueDiceElRasgo(rasgos, cuantasFortalezas, reloj) {
  if (rasgos.length === 0) return { rasgos, sobran: new Set() };

  const listado = rasgos
    .map((r, i) => `${i === 0 ? 'FORTALEZAS\n' : ''}${i === cuantasFortalezas ? '\nDESAFIOS\n' : ''}${i + 1}. ${r.nombre}. ${r.descripcion}`)
    .join('\n');

  // Cual esta mal lo decide el codigo contando, no el modelo. El modelo solo
  // escribe lo nuevo, que eso si es cosa suya.
  const aArreglar = [];
  const pedidos = new Set();
  for (let i = 0; i < rasgos.length; i++) {
    const n = nombreQueNoVale(rasgos[i]);
    if (n) { aArreglar.push(`- el nombre del ${i + 1}, que ${n}`); pedidos.add(i); }
  }
  if (aArreglar.length > 0) console.warn(`Mal puestos: ${aArreglar.length} nombres de ${rasgos.length} rasgos`);

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    // Esta es la llamada corta de las tres. Pasados setenta segundos, colgada.
    signal: reloj.senal(70000),
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-5',
      thinking: { type: 'disabled' },
      // La respuesta son un area por rasgo, los numeros que sobran y algun
      // nombre nuevo. Poco, pero con cuarenta rasgos ya no cabia en dos mil, y
      // una respuesta cortada no se puede leer y gasta los tres intentos.
      max_tokens: 6000,
      system: `Un estudio de personalidad tiene siete areas:

${QUE_CUBRE_CADA_AREA}

Te paso los rasgos de una persona, numerados. Vienen de dos listas: primero sus FORTALEZAS y despues sus DESAFIOS, y en el listado se ve donde empieza cada una.

Haces dos cosas.

1. "areas": a cual de las siete pertenece cada rasgo POR LO QUE DICE, no por otra cosa. Si toca dos, la que mas pesa en lo que esta escrito. Una area por rasgo, en el mismo orden y sin saltarte ninguno, escritas tal cual estan arriba.

2. "sobran": los numeros de los rasgos que hay que quitar. Las dos listas se han escrito por separado y ninguna sabia lo que decia la otra, asi que se pisan. Se quita un rasgo cuando:
   - DICE LO MISMO que otro, aunque sea con otras palabras. Se queda el que este mejor contado y el otro sobra.
   - DICE LO CONTRARIO que uno de la otra lista: una fortaleza que afirma justo lo que un desafio niega, o al reves. No pueden convivir las dos, asi que sobra una: se queda la que este mejor contada y mejor apoyada.
   Solo eso. Un rasgo duro no sobra por ser duro, y dos rasgos de la misma parcela de su vida no sobran si dicen cosas distintas. Si no hay nada que quitar, devuelves la lista vacia.

3. "nombres": abajo te digo que rasgos tienen el nombre mal puesto, y por que. De cada uno devuelves su numero con el nombre nuevo.
   El nombre nuevo dice lo mismo que el que tenia y con sus mismas palabras, cambiando solo que le hable de tu. No es una etiqueta: es lo que hace o lo que le pasa, dicho a ella.
   Si abajo no te digo ninguno, devuelves la lista vacia.

4. "masPeso": los numeros de los rasgos que MAS PESAN en su vida, mirando area por area. De cada area, como mucho DOS fortalezas y TRES desafios, y de las siete areas.
   Eres el unico que ve las dos listas enteras, por eso lo decides tu. Son los que se van a desarrollar a fondo en el estudio, asi que eliges los que mas la van a mover al leerlos, no los que mejor suenan escritos. Los que no elijas salen igual en su lista, solo que no se desarrollan.
   Si de un area hay menos de esos, pones los que haya.`,
      output_config: { format: { type: 'json_schema', schema: ESQUEMA_AREAS } },
      messages: [{ role: 'user', content: aArreglar.length > 0
        ? `${listado}\n\nESTO HAY QUE CAMBIARLO (el numero es el del rasgo de arriba):\n${aArreglar.join('\n')}`
        : listado }],
    }),
  });

  if (!response.ok) {
    const err = new Error(`clasificar areas: ${response.status}`);
    // Igual que en las listas: la saturacion y los errores del servidor se
    // reintentan; una peticion mal formada o la clave mal no van a mejorar.
    err.temporal = response.status === 429 || response.status >= 500;
    throw err;
  }

  const data = await response.json();
  const texto = (data.content || []).filter(b => b && typeof b.text === 'string').map(b => b.text).join('');

  let dichas, marcados, renombrados, pesan;
  try {
    const leido = JSON.parse(texto);
    dichas = (leido.areas || []).map(a => String(a).trim().toUpperCase());
    marcados = (leido.sobran || []).map(Number).filter(n => Number.isInteger(n) && n >= 1 && n <= rasgos.length);
    // Lo nuevo tiene que pasar la misma prueba que lo viejo; si no, el rasgo se
    // queda con lo que tenia, que al menos es suyo.
    pesan = (leido.masPeso || []).map(Number).filter(n => Number.isInteger(n) && n >= 1 && n <= rasgos.length).map(n => n - 1);
    renombrados = new Map();
    for (const x of (leido.nombres || [])) {
      const i = Number(x && x.numero) - 1;
      const nuevo = String((x && x.nombre) || '').trim();
      if (!Number.isInteger(i) || i < 0 || i >= rasgos.length) continue;
      // SOLO SE CAMBIA LO QUE SE HA PEDIDO CAMBIAR.
      //
      // Cual esta mal lo cuenta el codigo, y aun asi aqui se aceptaba cualquier
      // numero que devolviera. En el informe 116 se pidieron unos pocos y se
      // reescribieron 19 nombres: rasgos que estaban bien salieron con otro
      // titulo, escrito sin haberlo mirado nadie.
      if (!pedidos.has(i)) continue;
      if (!nuevo || nombreQueNoVale({ nombre: nuevo })) continue;
      renombrados.set(i, nuevo);
    }
  } catch (e) {
    const err = new Error('clasificar areas: la respuesta no es JSON valido');
    err.temporal = true;
    throw err;
  }

  // Solo se hace caso si contesta una por rasgo. Si se salta alguno no se sabe
  // cual, asi que no vale nada de lo que ha dicho y se vuelve a pedir.
  if (dichas.length !== rasgos.length) {
    const err = new Error(`clasificar areas: dijo ${dichas.length} de ${rasgos.length}`);
    err.temporal = true;
    throw err;
  }

  // Si dice que sobra media lista, no se le hace caso: algo ha entendido mal y
  // vaciar el informe es peor que dejar un rasgo repetido. El tope es la quinta
  // parte, que da de sobra para lo que de verdad se pisa.
  const TOPE = Math.max(1, Math.floor(rasgos.length / 5));
  const sobran = new Set(marcados.length > TOPE ? [] : marcados.map(n => n - 1));
  if (marcados.length > TOPE) {
    console.warn(`Areas: decia que sobraban ${marcados.length} de ${rasgos.length} rasgos, demasiados, no se quita ninguno`);
  }

  if (renombrados.size > 0) console.warn(`Se cambia el nombre a ${renombrados.size} rasgos`);

  // Y el rasgo al que le diga algo que no es un area se queda con la suya.
  const nuevos = rasgos.map((r, i) => ({
    ...r,
    area: NOMBRES_DE_AREA.includes(dichas[i]) ? dichas[i] : r.area,
    nombre: renombrados.has(i) ? renombrados.get(i) : r.nombre,
  }));
  // Los que mas pesan se devuelven como los rasgos mismos, no como numeros:
  // mas abajo se quitan rasgos y los numeros dejarian de cuadrar.
  return { rasgos: nuevos, sobran, masPeso: new Set(pesan.map(i => nuevos[i])) };
}

// Se reintenta por su cuenta, igual que cada lista y cada area. Sin esto, un
// 429 de los que salen cuando hay siete peticiones a la vez dejaba los rasgos
// con el area de su caja sin que se notara, que es justo lo que se arregla
// aqui. Si aun asi no sale, el informe se entrega con las areas de las cajas.
async function conElAreaDeLoQueDice(rasgos, cuantasFortalezas, INTENTOS, reloj) {
  let ultimoError;
  for (let intento = 1; intento <= INTENTOS; intento++) {
    try {
      return await porLoQueDiceElRasgo(rasgos, cuantasFortalezas, reloj);
    } catch (err) {
      ultimoError = err;
      // Un corte de red llega sin marca; se trata como temporal.
      const temporal = err.temporal !== false;
      if (!temporal || intento === INTENTOS) break;
      console.warn(`Area por lo que dice el rasgo: intento ${intento} fallido (${err.message.slice(0, 80)}), reintentando`);
      await new Promise(r => setTimeout(r, 1500 * intento));
    }
  }
  throw ultimoError;
}

// LO QUE SE LE MANDA A CADA AREA: SOLO LO QUE CABE.
//
// A cada area se le mandaban TODOS sus rasgos. Si a MIEDOS le tocaban cinco
// desafios, el area desarrollaba los cinco, y con cinco cosas contadas no queda
// sitio para desarrollar ninguna a fondo. El encargo pedia "una o dos
// fortalezas y dos o tres desafios" y no se cumplia: contar es cosa del codigo,
// no del modelo. Asi que ahora el area solo recibe los que caben, y lo que no
// tiene delante no lo puede desarrollar.
//
// Cuales pesan mas lo dice la llamada que ya ve las dos listas enteras, la
// misma que le pone el area a cada rasgo: es la unica que las tiene delante a
// la vez. Si no lo dice, o dice menos de los que caben, se completan por el
// orden en que estan escritos, que es el orden en que el encargo le pide
// escribirlos: primero los de mas peso.
//
// Los que se quedan fuera NO se pierden: salen igual en su lista del PDF.
const CUANTOS_POR_AREA = { fortalezas: 2, desafios: 3 };

function losQuePesan(lista, cual, masPeso) {
  const tope = CUANTOS_POR_AREA[cual] || 2;
  const salen = [];
  for (const area of NOMBRES_DE_AREA) {
    const suyos = lista.filter(r => r.area === area);
    const dichos = suyos.filter(r => masPeso.has(r));
    const resto = suyos.filter(r => !masPeso.has(r));
    salen.push(...dichos.slice(0, tope));
    salen.push(...resto.slice(0, Math.max(0, tope - dichos.length)));
  }
  return salen;
}

// Las dos listas se piden A LA VEZ, una llamada cada una. Juntas escriben lo
// mismo que antes escribia una sola, pero tardan la mitad porque van en
// paralelo, igual que las siete areas.
async function sacarRasgos(nombrePila, sexo, cartaTexto, INTENTOS, reloj) {
  // 1. Las dos listas, a la vez, y sin nombrarle la carta a quien lo lee.
  let [fortalezas, desafios] = await Promise.all([
    sacarUnaLista('fortalezas', nombrePila, sexo, cartaTexto, INTENTOS, reloj)
      .then(l => sinNombrarLaCarta('fortalezas', nombrePila, sexo, cartaTexto, l, reloj)),
    sacarUnaLista('desafios', nombrePila, sexo, cartaTexto, INTENTOS, reloj)
      .then(l => sinNombrarLaCarta('desafios', nombrePila, sexo, cartaTexto, l, reloj)),
  ]);

  // 2. Ya escritos, se les pone el area de lo que dicen, y se quita lo que se
  //    pisa. Las dos listas van juntas en la misma peticion a proposito: es el
  //    unico sitio donde se ven las dos a la vez.
  //
  //    Se escriben en paralelo, cada una en su llamada, asi que la de fortalezas
  //    no sabe lo que ha escrito la de desafios. De ahi salia que una dijera
  //    "sabes mirarte con honestidad" y la otra "evitas mirar lo que te falta".
  //    Ninguna regla del encargo puede arreglar eso, porque el modelo no tiene
  //    delante la otra lista. Aqui si.
  //
  //    Si falla, cada rasgo se queda con el area de su caja, no se quita nada y
  //    el informe sale igual.
  let masPeso = new Set();
  try {
    // Tambien esta se salta si ya no cabe con las siete areas detras: sin ella
    // cada rasgo se queda con el area de su caja y el informe sale igual.
    if (!reloj.hayTiempoPara(90)) throw new Error('no da tiempo, se deja el area de cada caja');
    const cuantasFortalezas = fortalezas.length;
    const { rasgos: todos, sobran, masPeso: pesan } = await conElAreaDeLoQueDice(
      fortalezas.concat(desafios), cuantasFortalezas, INTENTOS, reloj);
    masPeso = pesan || new Set();
    if (sobran.size > 0) console.warn(`Se quitan ${sobran.size} rasgos que se pisaban con otro`);
    const buenos = todos.filter((r, i) => !sobran.has(i));
    // El corte se hace por la lista de la que venia cada uno, no por el numero,
    // porque al quitar rasgos los sitios ya no cuadran.
    const cuantasQuedan = todos.filter((r, i) => i < cuantasFortalezas && !sobran.has(i)).length;
    fortalezas = buenos.slice(0, cuantasQuedan);
    desafios = buenos.slice(cuantasQuedan);
  } catch (err) {
    console.error(`No se pudo poner el area por lo que dice el rasgo: ${err.message.slice(0, 90)}`);
  }

  // 3. Fuera el que repite el titulo de otro. Va ANTES del minimo, no despues:
  //    quitar un repetido puede dejar un area con un rasgo, y el minimo es el
  //    paso que la vuelve a llenar. Al reves, el area se quedaba corta y asi se
  //    entregaba. En el informe 114 habria pasado justo eso en DINERO.
  //
  //    Casi nunca cuesta nada: solo se pide relleno si al quitar el repetido un
  //    area baja del minimo, que es lo que el encargo pide de todas formas.
  [fortalezas, desafios] = sinTituloRepetido(fortalezas, desafios);

  // 3b. Y con las areas ya en su sitio y sin repetidos, se comprueba el minimo.
  //     En este orden, porque mover un rasgo de area, o quitar uno repetido,
  //     puede dejar la de origen corta.
  [fortalezas, desafios] = await Promise.all([
    conElMinimoPorArea('fortalezas', nombrePila, sexo, cartaTexto, fortalezas, reloj),
    conElMinimoPorArea('desafios', nombrePila, sexo, cartaTexto, desafios, reloj),
  ]);

  // 4. Y se ordenan por area. Salian agrupadas porque se escriben caja por
  //    caja, pero al cambiarle el area a un rasgo, y al añadir los del relleno
  //    por el final, el orden se rompia y en el PDF aparecian las etiquetas
  //    salteadas. El PDF los pinta tal cual se los damos, asi que se ordenan
  //    aqui, en el orden en que van las areas en el informe.
  // El rasgo cuya posicion no se reconoce se queda sin area y va al final, que
  // es donde menos se nota que no lleva etiqueta.
  const sitio = r => (NOMBRES_DE_AREA.indexOf(r.area) + 1) || NOMBRES_DE_AREA.length + 1;
  const porArea = (a, b) => sitio(a) - sitio(b);
  fortalezas = fortalezas.slice().sort(porArea);
  desafios = desafios.slice().sort(porArea);

  // 5. Y aparte, lo que se le manda a las areas: solo los que caben. La lista
  //    del PDF sigue llevandolos todos; esto es otra cosa y va por su lado.
  return {
    fortalezas,
    desafios,
    paraLasAreas: {
      fortalezas: losQuePesan(fortalezas, 'fortalezas', masPeso),
      desafios: losQuePesan(desafios, 'desafios', masPeso),
    },
  };
}


// ═════════════════════════════════════════════════════════════════
// AVISO AL ADMIN (via Brevo) — mismo formato que save-pdf.js
// ═════════════════════════════════════════════════════════════════
async function enviarEmailAdmin({ asunto, mensaje }) {
  const BREVO_API_KEY = process.env.BREVO_API_KEY;
  if (!BREVO_API_KEY) return;

  const body = {
    sender: { email: 'hola@origennatal.com', name: 'ORIGEN NATAL — Alertas' },
    to: [{ email: 'hola@origennatal.com', name: 'Admin' }],
    subject: asunto,
    htmlContent: `<pre style="font-family:monospace;background:#fff5f4;padding:16px;border-radius:8px;">${mensaje}</pre>`,
  };

  await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    // Un aviso que no sale no puede costarle el informe a nadie.
    signal: AbortSignal.timeout(10000),
    headers: {
      'accept': 'application/json',
      'content-type': 'application/json',
      'api-key': BREVO_API_KEY,
    },
    body: JSON.stringify(body),
  });
}
