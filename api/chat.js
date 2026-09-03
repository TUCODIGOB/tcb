import Stripe from 'stripe';
import { compraValida, esDelProducto, MAX_INTENTOS, estado, reservar, liberar } from '../lib/reserva.js';

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
//   - decide si un reintento cabe. La llamada de los rasgos tarda, y volver a
//     pedirla sin sitio para las siete areas detras deja a la clienta sin
//     informe habiendo pagado. Vale mas el informe entero.
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
    // La cerradura del P1: se exige que este pagado Y que sea del P1. El
    // recibo de otro producto no abre este camino.
    if (!compraValida(session) || !esDelProducto(session, 'p1')) {
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

LE HABLAS A ELLA, NUNCA DE ELLA. Todo el estudio va dirigido a la persona que lo lee, de tú, de principio a fin. Su nombre se usa para llamarla, nunca como sujeto de una frase: la frase empieza por lo que hace ella -"tú"-, no por su nombre seguido de un verbo en tercera persona. En cuanto una frase habla de ella en tercera persona, deja de ser suyo y parece el informe de otra.

ESTILO DE ESCRITURA:
- EL TONO ES EL DE ALGUIEN QUE LA QUIERE BIEN Y SE LO DICE CLARO. Cercano y cálido, pero sin rodeos: le nombra a la cara lo que le pasa, sin suavizarlo y sin castigarla. Nunca suena a experto explicando, ni a informe, ni a libro. La fuerza está en lo que le dice, no en cómo lo adorna
- Sin listas, sin viñetas, sin símbolos, todo en párrafos corridos
- No uses nombres de planetas ni casas astrológicas. Pero SÍ tienes que apoyarte en ellos: la casa de cada planeta dice en qué parcela concreta de la vida se nota (trabajo, pareja, dinero, familia, cuerpo, amigos, casa, estudios), y los aspectos dicen qué partes de la persona chocan entre sí y cuáles se apoyan. Traduce eso a situaciones reales de su vida, sin nombrarlo nunca. Un texto escrito solo con el signo de cada planeta le vale igual a una de cada doce personas, y se nota al leerlo
- No empieces dos párrafos con la misma estructura. Varía los arranques
- NO SE ESCRIBE "tu manera de", "tu forma de", "tu capacidad de", "una necesidad de", "una tendencia a", "una parte de ti" ni "la parte de ti que". Convierten en cosa lo que ella hace, y quien lee tiene que volver atrás para entenderlo. Donde salga uno de esos, se dice con un verbo lo que hace ella
- SE LE PONE SU VOZ: lo que se dice a sí misma por dentro cuando le pasa eso, dicho con las palabras que usaría ella y no con las de quien la observa. Eso es lo que hace que se reconozca. Sale de lo que ya se ha contado, no de suponerle nada
- LA IDEA SE DICE EN CLARO, SIEMPRE Y EN LITERAL. Cada cosa que le cuentes se dice en seco: qué hace, qué le pasa o cómo se le nota, con palabras que se puedan agarrar. Si tapas todo lo demás y esa frase sola no dice nada concreto de ella, está mal escrita.
- NADA DE METÁFORAS NI IMÁGENES. Se dice la cosa, no una figura de la cosa. Y mucho menos una comparación inventada sobre la marcha, de esas que no existen en español y que el lector no puede ver en la cabeza: eso no explica nada, despista. Si has escrito una comparación, bórrala y di en literal lo que querías decir con ella.
- LA ÚNICA EXCEPCIÓN ES EL CIERRE, y con condiciones: ahí puedes usar UNA comparación, pero de las de toda la vida, de las que cualquiera entiende al leerlas una sola vez y puede ver en la cabeza. Nada de imágenes inventadas ni de palabras raras: si hay que pararse a descifrarla, no vale y se dice en literal. Fuera del cierre, ninguna.
- SE ENTIENDE A LA PRIMERA. Si una frase obliga a volver atrás para entenderla, está mal escrita y se cambia. Esa prueba manda sobre lo bonito que quede, y sobre cualquier otra regla de aquí: entre escribirlo bonito y que se entienda, se entiende.
- Y esto se lee de noche, con el día encima y muchas veces en el móvil. Quien lo lee no relee: si tropieza, lo deja.
- LAS PALABRAS SON LAS DE TODOS LOS DÍAS, no las de un informe ni las de un libro. Si una palabra la verías antes escrita en un informe que dicha en una conversación normal, va fuera. Lo tiene que entender alguien de dieciocho años sin releer nada.
- NO SE HABLA DE PARTES SUYAS COMO SI FUERAN COSAS CON VIDA PROPIA que se mueven, chocan, se doblan, se construyen o se mezclan. Se dice lo que hace la persona.
- NADA DE "ese", "esa" NI "ese mismo" SI NO LO HAS DICHO ANTES CON TODAS SUS LETRAS. Si señalas algo suyo, antes tiene que estar contado en claro qué es; si no, el lector no sabe de qué le hablas.
- PROHIBIDO CONTAR ALGO SOLO CON UNA SENSACIÓN. Si al leer una frase no se sabe qué hace ella o qué le pasa exactamente, esa frase no vale y se reescribe diciéndolo. Describir cómo se siente algo no es contar qué es.
- PROHIBIDO DECIR DOS VECES LA MISMA IDEA CON OTRA ROPA. Si el párrafo siguiente cuenta lo mismo que el anterior cambiando las palabras, sobra: o dice algo nuevo, o no va. Eso es lo que hace que parezcan muchas ideas cuando hay una.
- CADA FRASE TIENE QUE SONAR COMO HABLA UNA PERSONA DE VERDAD. Antes de dar una frase por buena, léela en voz alta por dentro: si nadie la diría hablando, está mal y se reescribe. No fuerces la gramática para que suene elaborado, y no cojas un verbo raro cuando el normal dice lo mismo. Lo que suena a literatura no emociona, distrae: el lector tropieza, sale del texto y deja de reconocerse.
- Vigila especialmente la primera frase del área. Si el lector tropieza ahí, ya no entra.
- PROHIBIDO ENUMERAR. Nunca anuncies cuántas cosas vas a decir ni las numeres: nada de "son tres", "el primero", "la segunda", "y la tercera", "hay dos cosas que". Las ideas se encadenan una detrás de otra, como cuando alguien te cuenta algo hablando, y el lector no necesita saber cuántas quedan. Si el área se pudiera convertir en una lista de viñetas sin perder nada, está mal escrita.
- CADA PÁRRAFO SE ENGANCHA CON EL ANTERIOR. Retomas una palabra, una imagen o una idea del párrafo de antes y sigues tirando del hilo desde ahí. Ningún párrafo empieza un tema nuevo en frío, y ninguno puede leerse suelto sin perder nada. Si quitas un párrafo y el resto se lee igual de bien, es que estaba puesto al lado y no cosido.
- UNA FRASE, UNA IDEA. Esta manda sobre lo largo que sea. Una frase puede ser larga y estar bien, si lo que hace es desarrollar UNA cosa a base de comas. Lo que no puede es meter dos o tres cosas distintas encadenándolas con "que", "porque", "cuando" o "aunque": ahí el lector suelta la primera para seguir la segunda, y acaba sin ninguna. Si al leerla en voz alta te falta el aire o tienes que volver atrás, lleva dos ideas dentro y se parte en dos.
- FRASES LARGAS, NO CORTAS, dentro de esa regla. Se escribe con comas y seguido, como habla alguien. PROHIBIDO encadenar tres frases cortas seguidas: eso suena a titular y no a una persona. Las de menos de diez palabras se reservan para rematar, dos o tres en toda el área como mucho.
- LOS DEFECTOS SE CUENTAN DESDE LA FUERZA QUE LOS ORIGINA, NUNCA CONTRA ELLA. Esto NO es suavizar ni maquillar: el defecto se nombra entero, con su nombre y sin rebajarlo. Lo que cambia es de dónde lo haces salir. Y no vale poner la virtud y el defecto uno al lado del otro como si fueran dos cosas distintas ("eres muy exigente contigo, pero también tienes buen criterio"), porque no son dos cosas: son la misma cualidad, solo que pasada de vueltas ("ese criterio tuyo, pasado de vueltas, es lo que te machaca"). Contado así lo reconoce y no se defiende. Contado como una lista de fallos sueltos, cierra el informe y no vuelve.
- PREGÚNTALE DIRECTAMENTE. De vez en cuando párate y hazle una pregunta de verdad, de las que se quedan un rato dando vueltas. La referencia es esta: la pregunta que le haría alguien que la conoce bien, en una conversación de verdad, no la que saldría en un folleto. Tiene que ser tan suya que si se la hicieras a otra persona no significaría nada.
- CADA PREGUNTA, UNA SOLA IDEA. Se lee de una vez y se entiende sin releerla. Nada de preguntas que abren una cosa, la matizan con una segunda y aún meten una tercera detrás: eso ya no es una pregunta, es un párrafo con interrogantes, y no se contesta. Si no cabe cómoda en dos renglones, sobra algo dentro.
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
- REGLA CRÍTICA DE LONGITUD: el número de palabras de esta área viene abajo, en la petición, y es OBLIGATORIO. No cuentes párrafos ni te marques un número: salen los que salgan. Un área por debajo de su mínimo es un ERROR GRAVE que rompe el producto final. Si te sale corta, AMPLÍA con más detalle y más ejemplos, AÑADIENDO párrafos nuevos, nunca engordando los que ya tienes.

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
LOS PUNTOS QUE CUBRE HOY EN ESTA ÁREA VIENEN ESCRITOS ABAJO, EN LA PETICIÓN. NO SE SALTAN NI SE FUNDEN ENTRE ELLOS. Si a un área le tocan cuatro, se cuentan los cuatro, y si le tocan tres, los tres. Cada uno con su sitio y su desarrollo: si terminas un área y uno de sus puntos no está contado, o está resuelto de pasada dentro de otro, el área no está terminada y la repasas antes de entregarla.

SUBTÍTULOS — el área lleva TRES O CUATRO subtítulos cortos repartidos por dentro, y cada uno va solo en su párrafo y empieza por "## ", la marca, un espacio y ya la primera palabra del subtítulo. No lleva punto al final.
DÓNDE VA CADA UNO: justo donde dejas un asunto y empiezas a contarle otro, sea donde sea del área. No hay sitios fijos: lo pones donde el lector nota que cambias de tema, pegado al párrafo que abre lo nuevo, y nunca en medio de una idea que sigue. Si el área no cambia de asunto ahí, no va subtítulo. NO SE PONEN NI EN LA ESCENA NI EN EL CIERRE. Y EL ÁREA NUNCA EMPIEZA CON UN SUBTÍTULO: el primer párrafo del área entra directo, y el primer subtítulo no llega hasta que cambias de asunto por primera vez.
CÓMO ES UN SUBTÍTULO: de tres a seis palabras, entendido de una sola lectura, y sacado de lo que cuentas justo debajo, con las palabras de eso. NUNCA el nombre del bloque, ni nada que sirva para cualquier persona: si ese mismo subtítulo pudiera ir en otra área o en el estudio de otra persona, no vale y lo cambias. Y ninguno se repite dentro del área.

ESCENA — la escena real obligatoria, tal como pide la sección ESCENA REAL OBLIGATORIA. Va donde diga la secuencia de esta área, y ahí nunca es el primer bloque ni el último: no abre el área ni la cierra. Y CADA PÁRRAFO DE LA ESCENA EMPIEZA CON "> ": el signo mayor y un espacio, pegados delante de su primera palabra, sea cual sea. Solo los de la escena, ningun otro parrafo del area lleva esa marca. Esto NO ES OPCIONAL Y NO TIENE EXCEPCIONES: si el area lleva escena, sus parrafos van marcados. Un area cuya escena no lleve la marca no esta terminada.

ORIGEN — POR QUÉ ES ASÍ, con puente causal explícito hasta lo que hace hoy. Es el porqué de SUS DESAFÍOS, de dónde le nacen, y solo de ellos. No basta con decir que le pasa: tienes que unir causa y efecto para que entienda el PORQUÉ y no solo el qué. Qué hay dentro de ella que produce eso, cómo funciona ese mecanismo y qué hace hoy exactamente por funcionar así.
UNA SOLA EXPLICACIÓN, NO VARIAS. Eliges la que mejor lo explique todo y la desarrollas a fondo. Está PROHIBIDO apilar dos o tres explicaciones distintas una detrás de otra, aunque cada una sea buena por separado: se lee como relleno para llegar a las palabras que faltan, y ninguna acaba de calar. Si de esa única explicación salen dos consecuencias en su vida de hoy, cuéntalas, eso es desarrollarlo; lo que no vale es empezar de cero con otra distinta.

CREENCIAS — LO QUE SOSTIENE EL PATRÓN, Y QUÉ SE LE ABRE SI CAE. Lo que da por cierto sin haberlo puesto en duda nunca y que hace que todo lo demás se repita solo. Aquí va la verdad incómoda, la frase exacta que le escuece leer porque no la puede negar. Va una por cada desafío que hayas contado en esta área, y cuando dos se apoyan en la misma, se dice una sola vez y no se repite. Y de cada una se dice también qué se le abre en su vida el día que caiga: qué deja de pasarle, qué puede hacer que hoy no hace. Eso NO es decirle cómo soltarla: ni pasos, ni ejercicios, ni plan, ni "empieza por", ni por dónde. El cómo es otro producto y aquí sobra. Después de HOY, es el punto que más sitio ocupa.

CIERRE — el cierre, tal como pide la sección CIERRE DE CADA ÁREA. Además tiene que salir del contenido concreto de ESTA área y de ESTA persona: si ese mismo cierre pudiera ir al final de cualquiera de las otras seis áreas, no vale y lo reescribes.

SIN SOLAPE ENTRE LOS CINCO BLOQUES:
Cada bloque cuenta una cosa y solo una, y lo que ya has dicho en uno no se repite en otro. Lo de hoy va en HOY y no reaparece dentro de CREENCIAS. La escena no se anuncia antes ni se resume después: se cuenta y se sigue. El cierre no es un resumen de nada de lo anterior. Si al escribir un bloque notas que estás diciendo otra vez algo que ya contaste, córtalo y sigue adelante: no sobra sitio para repetirse en ninguna de las áreas.

EL ORDEN DE LOS CINCO BLOQUES CAMBIA SEGÚN EL ÁREA:
Las siete áreas se leen seguidas dentro del mismo informe. Si las siete siguen el mismo esqueleto se nota, y el estudio deja de parecer escrito para esa persona y empieza a parecer una plantilla rellenada. Por eso cada área lleva su propia secuencia. El cierre es lo único que va siempre al final, porque es el cierre.

LA SECUENCIA DE ESTA ÁREA VIENE ESCRITA ABAJO, EN LA PETICIÓN, Y SE SIGUE EXACTAMENTE.

Cuando un bloque te caiga en un sitio que no es el que pediría la lógica de siempre, engánchalo bien con lo que va antes: el texto tiene que leerse como alguien hablando seguido, nunca como piezas sueltas colocadas en otro orden.

Y NINGUNA ÁREA ABRE COMO OTRA. Las siete van seguidas en el mismo informe y ella las lee del tirón, así que si varias arrancan con el mismo giro se nota a la primera y el estudio empieza a parecer una plantilla. La primera frase de cada área entra directa en lo que toca contar y le habla a ella, sin fórmula de presentación por delante. Ni siquiera la misma primera palabra: si un área arranca con "Hay", ninguna otra arranca con "Hay". EL ARRANQUE NO HABLA DE LA CARTA NI DEL ESTUDIO. Nada de "hay cartas que", "lo que cuenta tu carta", "esta lista de rasgos", "lo que vas a leer": eso es hablarle del producto en vez de hablarle a ella. La primera frase ya está dentro de su vida. Y NO SE APOYA EN NADA ANTERIOR, porque no hay nada antes: nada de "lo que sostiene esto", "todo esto viene de", "eso que te pasa". Un "esto" o un "eso" en la primera frase no señala a ninguna parte y se lee como si faltara un trozo. Se nombra la cosa entera.

NADA DE FRASES MOLDE:
Como las siete áreas van juntas, cualquier fórmula que repitas en todas canta al leerlas del tirón. La lógica de fondo se mantiene siempre (qué te pasa, de dónde viene, qué creencia lo sostiene, qué se cae), lo que cambia en cada área es cómo se dice y en qué orden aparece. Quedan PROHIBIDAS estas fórmulas y cualquier variante suya:
- "el bucle es siempre el mismo", "el patrón es siempre el mismo", "y así una y otra vez"
- "lo que tienes que soltar es", "lo que te toca soltar es", "toca soltar"
- "el día que ... todo cambia", "el día que ... todo empieza", "cuando entiendas esto, todo cambia"
No las cambies por otra fórmula fija: dilo cada vez de una manera distinta, que salga de lo que acabas de contar y no de una plantilla.

CIERRE DE CADA ÁREA (OBLIGATORIO):
El área termina con un párrafo de cierre potente, no con una frase suave o vaga. El cierre tiene que hacer clic en la cabeza del lector, dejarle pensando, como esa frase que alguien te dice una vez y no se te olvida. Puede ser una verdad directa, una paradoja, una frase corta que golpea. No debe ser un resumen, ni un consejo, ni motivación barata. Es la frase que el lector subrayaría si tuviera un lápiz. Y ES UN PÁRRAFO, NUNCA UNA FRASE SUELTA: una sola línea de despedida no cierra nada, se lee como un pie de página. Y NO LLEVA NI UNA PREGUNTA, ni dentro ni justo antes: el cierre afirma, y la última pregunta del área tiene que haberse quedado bien atrás, con texto por medio.

CÓMO SUENA UN CIERRE QUE FUNCIONA, sin que aquí vaya escrito ninguno:

Le dice algo que ella ya sabía sin haberlo pensado nunca con esas palabras, y por eso lo reconoce en cuanto lo lee. Sale de lo que se acaba de contar en ESA área, no de una frase que valdría para cualquiera. Le habla de tú y en presente. Y no promete nada ni la anima: afirma, y ahí se queda.

Si lo que has escrito podría cerrar cualquier otra de las siete áreas, o el informe de otra persona, no es el cierre: es una frase bonita, y se tira.

PROHIBICIONES ABSOLUTAS:
- No repetir el título del área en el texto
- No causas vagas sin explicar cómo y cuándo
- No frases de autoayuda ni coaching
- No decir qué debe hacer la persona
- PROHIBIDO empezar párrafos con "La verdad incómoda es", "Tienes que soltar", "Esto ocurre porque", "Esto empezó cuando" u otras fórmulas repetitivas
- PROHIBIDO escribir una cifra concreta de dinero, suya o de nadie: ni un importe, ni un sueldo, ni un precio, ni un ahorro, ni un porcentaje de nada. No sabes cuánto tiene ni cuánto gana, así que cualquier número que pongas es inventado y ella lo va a ver falso al leerlo. El dinero se nombra por lo que significa y por lo que hace con él, nunca por su cantidad

ESCRIBE CADA FRASE YA BIEN A LA PRIMERA. No escribas el área y la arregles después, ni entregues dos versiones de nada: sale una sola vez, y sale bien porque cada frase cumple las reglas de arriba al escribirla. Entre una frase simple que se entienda entera y una bonita que haya que releer, siempre la simple.
`;

  const AREAS = [
    {
      id: 1,
      prompt: `Genera ÚNICAMENTE el ÁREA 1 — IDENTIDAD para esta persona: quién es por dentro y cómo se vive a sí misma.

Esta área abre el estudio, así que empieza con una entrada de dos o tres frases que la sitúen antes de entrar en materia, como se abre un libro. Suave, sin prisa y sin adelantar lo que viene. Solo el área 1 lleva esa entrada.

EN ESTA ÁREA, EL BLOQUE HOY CUBRE cuatro cosas, cada una sacada de su carta y ninguna afirmada de pasada:
Cómo funciona por dentro: el mecanismo con el que procesa lo que le pasa, qué le ocurre primero y qué después, y qué consecuencia tiene ese orden en lo que hace por fuera. Es lo que le pone nombre a su manera de funcionar y lo que se lleva puesto al terminar de leer.
Lo que se le da bien de verdad: sus fortalezas reales, sobre todo las que no pondría primero si le preguntaras. Sin esto el área se convierte en un repaso de defectos y la persona cierra el informe tocada.
Los puntos ciegos que no ve: lo que hace y no registra como un problema, o que registra al revés, como si fuera una virtud. Es lo único del área que le cuenta algo que no sabía, así que aquí no te quedes en lo cómodo.
Qué muestra, qué oculta y qué contradicciones tiene: la distancia entre la persona que enseña y la que guarda, y las cosas suyas que no encajan entre sí y conviven igual. Es lo que hace que el texto suene a esa persona y no a un perfil que le valdría a cualquiera.
Esas cuatro cosas no se solapan entre ellas y ninguna vuelve a aparecer más adelante.

LA SECUENCIA DE ESTA ÁREA, EN ESTE ORDEN EXACTO: HOY, ESCENA, ORIGEN, CREENCIAS, CIERRE

CÓMO ENTRA CADA BLOQUE EN ESTA ÁREA: la ESCENA entra sin avisar, pegada a la frase anterior y arrancando por el momento concreto. El ORIGEN entra contestando algo que ella ya se ha preguntado alguna vez. Las CREENCIAS entran por la frase que ella se dice por dentro, dicha con sus palabras.

No pongas título ni encabezado. Solo el texto del área. Entre 1.100 y 1.300 palabras, en párrafos de longitud variada, entre 2 y 7 líneas, ninguno de más de 90 palabras.

EL ÁREA NO ESTÁ TERMINADA SI LE FALTA UNA SOLA DE ESTAS SEIS COSAS. Son obligatorias, no van a tu criterio, y son lo último que tienes que tener delante mientras escribes:
1. TODOS los puntos que le tocan a ESTA área, contados uno a uno y desarrollados. Si le tocan cuatro, están los cuatro; si le tocan tres, los tres. Ninguno resuelto de pasada dentro de otro ni dado por dicho.
2. LA ESCENA, con "> " delante de CADA UNO de sus párrafos: el signo mayor, un espacio, y ya la primera palabra, así "> Llevas...", "> Acabas de...", "> Estás...". Sin esa marca el área está sin terminar. Ningún otro párrafo del área lleva esa marca.
3. LOS SUBTÍTULOS, con "## " delante, uno cada vez que dejas un asunto y empiezas otro. En un área de este largo eso son TRES O CUATRO. Ninguno abre el área.
4. UNA o DOS fortalezas y DOS o TRES desafíos, ni más ni menos.
5. Su nombre de pila, dos veces como mínimo y separadas.
6. Los cinco bloques en la secuencia exacta de ESTA área, ningún párrafo por encima de 90 palabras, y ninguna fortaleza con un porqué inventado.
`
    },
    {
      id: 2,
      prompt: `Genera ÚNICAMENTE el ÁREA 2 — PATRONES para esta persona: qué repite una y otra vez sin darse cuenta.

EN ESTA ÁREA, EL BLOQUE HOY CUBRE cuatro cosas, cada una sacada de su carta y ninguna afirmada de pasada:
Cuáles son sus patrones: los que de verdad le gobiernan la vida, contados de forma concreta y reconocible, no uno genérico que le valdría a cualquiera.
Qué los enciende: la situación exacta que los dispara, la que hace saltar el automatismo antes de que se dé cuenta. Es lo que hace que se reconozca al leerlo.
Dónde acaba siempre: el mismo punto de llegada al que vuelve una vez tras otra, por caminos distintos y con gente distinta. Es donde ve que el patrón existe de verdad.
Qué gana con ellos: de qué la protegen, qué le evitan, qué se ahorra cada vez que los repite. Mientras no vea eso, va a seguir creyendo que es cuestión de fuerza de voluntad.
Lo que gana con el patrón va aquí; la creencia que lo sostiene va más adelante, en su sitio, y no se cuenta dos veces.

LA SECUENCIA DE ESTA ÁREA, EN ESTE ORDEN EXACTO: HOY, CREENCIAS, ESCENA, ORIGEN, CIERRE

CÓMO ENTRA CADA BLOQUE EN ESTA ÁREA: las CREENCIAS entran por lo que hace cuando se la cree, y la idea se nombra al final, no al principio. La ESCENA entra dentro de un párrafo ya empezado, sin punto y aparte delante. El ORIGEN entra por las dos partes suyas que chocan, nombradas las dos.

No pongas título ni encabezado. Solo el texto del área. Entre 850 y 900 palabras, en párrafos de longitud variada, entre 2 y 7 líneas, ninguno de más de 90 palabras.

EL ÁREA NO ESTÁ TERMINADA SI LE FALTA UNA SOLA DE ESTAS SEIS COSAS. Son obligatorias, no van a tu criterio, y son lo último que tienes que tener delante mientras escribes:
1. TODOS los puntos que le tocan a ESTA área, contados uno a uno y desarrollados. Si le tocan cuatro, están los cuatro; si le tocan tres, los tres. Ninguno resuelto de pasada dentro de otro ni dado por dicho.
2. LA ESCENA, con "> " delante de CADA UNO de sus párrafos: el signo mayor, un espacio, y ya la primera palabra, así "> Llevas...", "> Acabas de...", "> Estás...". Sin esa marca el área está sin terminar. Ningún otro párrafo del área lleva esa marca.
3. LOS SUBTÍTULOS, con "## " delante, uno cada vez que dejas un asunto y empiezas otro. En un área de este largo eso son TRES O CUATRO. Ninguno abre el área.
4. UNA o DOS fortalezas y DOS o TRES desafíos, ni más ni menos.
5. Su nombre de pila, dos veces como mínimo y separadas.
6. Los cinco bloques en la secuencia exacta de ESTA área, ningún párrafo por encima de 90 palabras, y ninguna fortaleza con un porqué inventado.
`
    },
    {
      id: 3,
      prompt: `Genera ÚNICAMENTE el ÁREA 3 — MIEDOS para esta persona: el miedo que gobierna su vida sin que lo nombre.

EN ESTA ÁREA, EL BLOQUE HOY CUBRE tres cosas, cada una sacada de su carta y ninguna afirmada de pasada:
Cuál es el miedo que gobierna su vida y qué inseguridad hay debajo: el que manda de verdad por debajo de los que nombraría si le preguntaras, y de qué tiene miedo en el fondo cuando tiene miedo de eso.
Qué se lo dispara y cómo reacciona cuando aparece: las situaciones concretas que lo encienden, y lo que hace en ese momento sin decidirlo, si se paraliza, si controla más, si se adelanta, si desaparece.
Qué está evitando por él y qué le ha costado ya: lo que lleva años sin hacer por ese miedo, y el precio que ha pagado sin llevar la cuenta, en oportunidades, en años, en cosas que no dijo a tiempo.

LA SECUENCIA DE ESTA ÁREA, EN ESTE ORDEN EXACTO: ORIGEN, ESCENA, HOY, CREENCIAS, CIERRE

CÓMO ENTRA CADA BLOQUE EN ESTA ÁREA: el ORIGEN abre el área nombrando el miedo por su nombre, a la cara y sin rodeo. La ESCENA entra por un objeto o un gesto concreto suyo. Las CREENCIAS entran por lo que evita hacer, y de ahí sale la idea.

No pongas título ni encabezado. Solo el texto del área. Entre 850 y 900 palabras, en párrafos de longitud variada, entre 2 y 7 líneas, ninguno de más de 90 palabras.

EL ÁREA NO ESTÁ TERMINADA SI LE FALTA UNA SOLA DE ESTAS SEIS COSAS. Son obligatorias, no van a tu criterio, y son lo último que tienes que tener delante mientras escribes:
1. TODOS los puntos que le tocan a ESTA área, contados uno a uno y desarrollados. Si le tocan cuatro, están los cuatro; si le tocan tres, los tres. Ninguno resuelto de pasada dentro de otro ni dado por dicho.
2. LA ESCENA, con "> " delante de CADA UNO de sus párrafos: el signo mayor, un espacio, y ya la primera palabra, así "> Llevas...", "> Acabas de...", "> Estás...". Sin esa marca el área está sin terminar. Ningún otro párrafo del área lleva esa marca.
3. LOS SUBTÍTULOS, con "## " delante, uno cada vez que dejas un asunto y empiezas otro. En un área de este largo eso son TRES O CUATRO. Ninguno abre el área.
4. UNA o DOS fortalezas y DOS o TRES desafíos, ni más ni menos.
5. Su nombre de pila, dos veces como mínimo y separadas.
6. Los cinco bloques en la secuencia exacta de ESTA área, ningún párrafo por encima de 90 palabras, y ninguna fortaleza con un porqué inventado.
`
    },
    {
      id: 4,
      prompt: `Genera ÚNICAMENTE el ÁREA 4 — HERIDA para esta persona: qué le sigue doliendo hoy y cómo le afecta.

EN ESTA ÁREA, EL BLOQUE HOY CUBRE tres cosas, cada una sacada de su carta y ninguna afirmada de pasada:
Cuál es la herida y qué la reabre hoy: qué le duele por dentro y qué le sigue faltando desde siempre, y las situaciones concretas de su vida de ahora que la vuelven a tocar.
Cómo se protege cuando se reabre, y qué se está perdiendo por protegerse así: lo que hace en ese momento para que no le vuelva a doler, y lo que esa misma protección le está dejando fuera.
Qué necesita de verdad en ese momento: ponerle nombre a lo que lleva años sintiendo sin saber decirlo, y qué acaba haciendo con esa necesidad.

LA SECUENCIA DE ESTA ÁREA, EN ESTE ORDEN EXACTO: CREENCIAS, HOY, ESCENA, ORIGEN, CIERRE

CÓMO ENTRA CADA BLOQUE EN ESTA ÁREA: las CREENCIAS abren el área con la idea dicha en su voz, como se la diría ella a sí misma. La ESCENA entra por lo que hace con las manos en ese momento. El ORIGEN entra por lo que le faltó, no por lo que le pasa hoy.

No pongas título ni encabezado. Solo el texto del área. Entre 850 y 900 palabras, en párrafos de longitud variada, entre 2 y 7 líneas, ninguno de más de 90 palabras.

EL ÁREA NO ESTÁ TERMINADA SI LE FALTA UNA SOLA DE ESTAS SEIS COSAS. Son obligatorias, no van a tu criterio, y son lo último que tienes que tener delante mientras escribes:
1. TODOS los puntos que le tocan a ESTA área, contados uno a uno y desarrollados. Si le tocan cuatro, están los cuatro; si le tocan tres, los tres. Ninguno resuelto de pasada dentro de otro ni dado por dicho.
2. LA ESCENA, con "> " delante de CADA UNO de sus párrafos: el signo mayor, un espacio, y ya la primera palabra, así "> Llevas...", "> Acabas de...", "> Estás...". Sin esa marca el área está sin terminar. Ningún otro párrafo del área lleva esa marca.
3. LOS SUBTÍTULOS, con "## " delante, uno cada vez que dejas un asunto y empiezas otro. En un área de este largo eso son TRES O CUATRO. Ninguno abre el área.
4. UNA o DOS fortalezas y DOS o TRES desafíos, ni más ni menos.
5. Su nombre de pila, dos veces como mínimo y separadas.
6. Los cinco bloques en la secuencia exacta de ESTA área, ningún párrafo por encima de 90 palabras, y ninguna fortaleza con un porqué inventado.
`
    },
    {
      id: 5,
      prompt: `Genera ÚNICAMENTE el ÁREA 5 — AMOR para esta persona: cómo vive las relaciones de pareja.

EN ESTA ÁREA, EL BLOQUE HOY CUBRE cuatro cosas, cada una sacada de su carta y ninguna afirmada de pasada:
Cómo es en el amor: cómo se comporta cuando quiere a alguien de verdad, cómo lo demuestra, cuánto se entrega y cuánto se guarda, y qué le pasa con el deseo y con la intimidad.
Qué tipo de persona atrae y por qué: quién se le acerca una y otra vez, qué tienen en común esas personas, y qué le da alguien así que no se está dando. Esto NO es lo mismo que lo que a ella le engancha, que va en el punto siguiente: aquí se cuenta a quién atrae ella, aunque no lo busque, y los dos puntos se cuentan enteros.
Qué necesita de la otra persona para sentirse querida y qué le enamora: lo que le hace falta para bajar la guardia, y lo que la engancha de alguien, que no siempre es lo mismo.
Dónde falla siempre y por qué: el punto exacto en el que la relación se tuerce, el momento que se repite en una historia tras otra, y qué hace ahí sin darse cuenta.
Dónde falla se cuenta aquí como lo que pasa, con hechos y momentos concretos; la idea que da por cierta y que hace que se tuerza ahí va más adelante, en su sitio, y no se cuenta dos veces.

LA SECUENCIA DE ESTA ÁREA, EN ESTE ORDEN EXACTO: HOY, ORIGEN, ESCENA, CREENCIAS, CIERRE

CÓMO ENTRA CADA BLOQUE EN ESTA ÁREA: el ORIGEN entra por la parcela concreta de su vida donde se le nota. La ESCENA entra por una conversación, y por lo que no llegó a decir en ella. Las CREENCIAS entran por la distancia entre lo que da y lo que pide.

No pongas título ni encabezado. Solo el texto del área. Entre 850 y 900 palabras, en párrafos de longitud variada, entre 2 y 7 líneas, ninguno de más de 90 palabras.

EL ÁREA NO ESTÁ TERMINADA SI LE FALTA UNA SOLA DE ESTAS SEIS COSAS. Son obligatorias, no van a tu criterio, y son lo último que tienes que tener delante mientras escribes:
1. TODOS los puntos que le tocan a ESTA área, contados uno a uno y desarrollados. Si le tocan cuatro, están los cuatro; si le tocan tres, los tres. Ninguno resuelto de pasada dentro de otro ni dado por dicho.
2. LA ESCENA, con "> " delante de CADA UNO de sus párrafos: el signo mayor, un espacio, y ya la primera palabra, así "> Llevas...", "> Acabas de...", "> Estás...". Sin esa marca el área está sin terminar. Ningún otro párrafo del área lleva esa marca.
3. LOS SUBTÍTULOS, con "## " delante, uno cada vez que dejas un asunto y empiezas otro. En un área de este largo eso son TRES O CUATRO. Ninguno abre el área.
4. UNA o DOS fortalezas y DOS o TRES desafíos, ni más ni menos.
5. Su nombre de pila, dos veces como mínimo y separadas.
6. Los cinco bloques en la secuencia exacta de ESTA área, ningún párrafo por encima de 90 palabras, y ninguna fortaleza con un porqué inventado.
`
    },
    {
      id: 6,
      prompt: `Genera ÚNICAMENTE el ÁREA 6 — RELACIONES para esta persona: cómo se vincula con los demás fuera de la pareja.

EN ESTA ÁREA, EL BLOQUE HOY CUBRE tres cosas, cada una sacada de su carta y ninguna afirmada de pasada. Aquí no se habla de pareja ni de amor, que es el área 5: aquí van los amigos, la familia, los compañeros de trabajo y los grupos.
Qué papel ocupa siempre sin decidirlo: el sitio que acaba ocupando con los demás una y otra vez, sin haberlo elegido y casi sin darse cuenta de que lo ocupa.
Qué pasa con lo que da y lo que recibe: si la balanza le sale igualada o no, cuánto sostiene y cuánto le sostienen, y qué hace cuando esa cuenta no le cuadra.
En qué dinámicas acaba metiéndose una y otra vez: el tipo de relación que se le repite con gente distinta, y qué se repite por dentro cada vez que vuelve a pasar.

LA SECUENCIA DE ESTA ÁREA, EN ESTE ORDEN EXACTO: ORIGEN, HOY, ESCENA, CREENCIAS, CIERRE

CÓMO ENTRA CADA BLOQUE EN ESTA ÁREA: el ORIGEN abre el área contando de dónde le viene el sitio que ocupa con la gente. La ESCENA entra por lo que hacen o dicen los demás, no por lo que hace ella. Las CREENCIAS entran por lo que le cuesta sostener ese sitio, y la idea llega al final del párrafo.

No pongas título ni encabezado. Solo el texto del área. Entre 850 y 900 palabras, en párrafos de longitud variada, entre 2 y 7 líneas, ninguno de más de 90 palabras.

EL ÁREA NO ESTÁ TERMINADA SI LE FALTA UNA SOLA DE ESTAS SEIS COSAS. Son obligatorias, no van a tu criterio, y son lo último que tienes que tener delante mientras escribes:
1. TODOS los puntos que le tocan a ESTA área, contados uno a uno y desarrollados. Si le tocan cuatro, están los cuatro; si le tocan tres, los tres. Ninguno resuelto de pasada dentro de otro ni dado por dicho.
2. LA ESCENA, con "> " delante de CADA UNO de sus párrafos: el signo mayor, un espacio, y ya la primera palabra, así "> Llevas...", "> Acabas de...", "> Estás...". Sin esa marca el área está sin terminar. Ningún otro párrafo del área lleva esa marca.
3. LOS SUBTÍTULOS, con "## " delante, uno cada vez que dejas un asunto y empiezas otro. En un área de este largo eso son TRES O CUATRO. Ninguno abre el área.
4. UNA o DOS fortalezas y DOS o TRES desafíos, ni más ni menos.
5. Su nombre de pila, dos veces como mínimo y separadas.
6. Los cinco bloques en la secuencia exacta de ESTA área, ningún párrafo por encima de 90 palabras, y ninguna fortaleza con un porqué inventado.
`
    },
    {
      id: 7,
      prompt: `Genera ÚNICAMENTE el ÁREA 7 — DINERO para esta persona: cómo se relaciona con el dinero.

EN ESTA ÁREA, EL BLOQUE HOY CUBRE tres cosas, cada una sacada de su carta y ninguna afirmada de pasada:
Qué significa el dinero para esa persona y qué le mueve a ganarlo: qué representa de verdad en su cabeza, más allá de los números, y qué es lo que la empuja a querer más o a conformarse.
Qué hace con él cuando lo tiene: cómo lo gasta, cómo toma las decisiones de dinero, y cómo lleva el riesgo cuando hay algo en juego.
Qué le bloquea para ganar más y qué pasa cuando empieza a irle bien: el techo con el que se encuentra una y otra vez, incluido lo que hace en el trabajo cuando toca pedir o cobrar lo que vale, y qué le ocurre justo cuando las cosas empiezan a salirle.

LA SECUENCIA DE ESTA ÁREA, EN ESTE ORDEN EXACTO: CREENCIAS, ESCENA, HOY, ORIGEN, CIERRE

CÓMO ENTRA CADA BLOQUE EN ESTA ÁREA: las CREENCIAS abren el área por lo que el dinero significa para ella, no por la idea en abstracto. La ESCENA entra por una decisión de dinero que tiene delante y no acaba de tomar, contada sin decir nunca de cuánto se trata. El ORIGEN entra por lo que se repite en las dos caras, lo compartido y lo suyo.

No pongas título ni encabezado. Solo el texto del área. Entre 850 y 900 palabras, en párrafos de longitud variada, entre 2 y 7 líneas, ninguno de más de 90 palabras.

EL ÁREA NO ESTÁ TERMINADA SI LE FALTA UNA SOLA DE ESTAS SEIS COSAS. Son obligatorias, no van a tu criterio, y son lo último que tienes que tener delante mientras escribes:
1. TODOS los puntos que le tocan a ESTA área, contados uno a uno y desarrollados. Si le tocan cuatro, están los cuatro; si le tocan tres, los tres. Ninguno resuelto de pasada dentro de otro ni dado por dicho.
2. LA ESCENA, con "> " delante de CADA UNO de sus párrafos: el signo mayor, un espacio, y ya la primera palabra, así "> Llevas...", "> Acabas de...", "> Estás...". Sin esa marca el área está sin terminar. Ningún otro párrafo del área lleva esa marca.
3. LOS SUBTÍTULOS, con "## " delante, uno cada vez que dejas un asunto y empiezas otro. En un área de este largo eso son TRES O CUATRO. Ninguno abre el área.
4. UNA o DOS fortalezas y DOS o TRES desafíos, ni más ni menos.
5. Su nombre de pila, dos veces como mínimo y separadas.
6. Los cinco bloques en la secuencia exacta de ESTA área, ningún párrafo por encima de 90 palabras, y ninguna fortaleza con un porqué inventado.
`
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
    const rasgos = await sacarRasgos(nombrePila, sexo, cartaConLasCasas, INTENTOS_POR_AREA, reloj);

    // Despues, las 7 areas a la vez. Cada una recibe los rasgos que el codigo
    // etiqueto con ella, que son los mismos que la clienta va a leer en el PDF.
    const resultados = await Promise.all(
      AREAS.map(area => generarArea(area, rasgos))
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

// CUANTOS RASGOS LLEVA CADA AREA, arriba y abajo.
//
// El suelo es lo que hace que ningun area se entregue coja. El techo es lo que
// impide que el informe acabe con cuarenta rasgos que se pisan: pasado ese
// numero, quien lo lee ya no distingue ninguno.
//
// No se le pide poco de entrada. Se le pide TODO lo que haya y despues, en el
// repaso, se quedan los que pesan: pedir pocos y limpiar despues deja areas por
// debajo del suelo, y entonces hace falta otra llamada para rellenarlas.
const POR_AREA = {
  fortalezas: { min: 1, max: 2 },
  desafios: { min: 2, max: 3 },
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

// El area de un rasgo. La decide el modelo, y se le hace caso.
//
// POR QUE SE LE HACE CASO Y ANTES NO. La etiqueta tiene que decir de que HABLA
// el rasgo, no de que posicion nacio, que es lo unico que ve quien lo lee. Un
// rasgo que sale del Sol y acaba hablando de su gente es de RELACIONES, aunque
// el Sol sea de IDENTIDAD.
//
// Antes eso no se podia saber aqui, asi que se exigia que el area elegida
// estuviera en la posicion; si no, mandaba la posicion. Era una red util
// mientras el modelo colocaba a ciegas, pero tambien devolvia a su sitio de
// nacimiento los rasgos que hablaban de otra cosa, que es el fallo que se
// intentaba arreglar con una llamada aparte.
//
// Ahora el repaso del encargo le pide releer cada rasgo entero y ponerlo en el
// area de lo que dice. Eso lo hace pensando y con el texto delante, que es la
// unica forma de saberlo. Pisarselo desde aqui seria deshacerlo.
//
// La posicion sigue decidiendo cuando el modelo no dice area o dice una que no
// existe: ahi no hay nada que respetar.
function areaDelRasgo(origen, elegida) {
  if (elegida && NOMBRES_DE_AREA.includes(elegida)) return elegida;
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

// ═════════════════════════════════════════════════════════════════
// LOS RASGOS, EN DOS PASOS: PRIMERO SE ELIGEN, DESPUES SE ESCRIBEN
//
// POR QUE ASI, Y NO DE UNA TIRADA.
//
// El fondo del problema, despues de un mes: al modelo se le pedia COMPARAR
// -"lee las listas juntas y quita lo que diga lo mismo"- con el razonamiento
// apagado. Comparar treinta cosas entre si y decidir cual sobra no se puede
// hacer sin pensar, por bien escrita que este la orden. Ningun retoque del
// encargo lo arreglo nunca, y no iba a arreglarlo.
//
// Pero pensarlo Y escribirlo en la misma llamada tampoco cabe. Se probo y se
// corto una compra de verdad a los dos minutos y medio: aqui no se escribe una
// lista corta, son treinta y tantos rasgos con su descripcion de tres renglones
// y su causa, varios miles de palabras. Pensar y escribir salen del mismo
// reloj, y el reloj lo tiene la clienta esperando delante.
//
// Asi que son dos pasos, y ninguno hace el trabajo del otro:
//
//   ELEGIR    piensa. Recorre la carta, saca todos los rasgos que haya, los
//             compara, quita los que dicen lo mismo, comprueba el suelo de cada
//             area y les pone su etiqueta. Devuelve UNA LINEA por rasgo: de que
//             lista es, de que area, como se llama y de donde sale. Poco texto,
//             asi que lo que tarda es lo que piensa.
//
//   ESCRIBIR  no piensa, y no elige nada. Recibe esos rasgos ya decididos y les
//             escribe la descripcion y la causa. Las dos listas van en paralelo
//             porque a estas alturas ya no hay nada que comparar: lo que se
//             podia pisar se quito antes.
//
// Es la misma idea que se probo antes de una tirada, partida donde tocaba.
// ═════════════════════════════════════════════════════════════════

// Elegir piensa y escribe poco: rara vez pasa del minuto.
const TOPE_DE_ELEGIR = 100000;
// Escribir no piensa, pero suelta varios miles de palabras.
const TOPE_DE_ESCRIBIR = 110000;

const ESQUEMA_DE_ELEGIR = {
  type: 'object',
  properties: {
    rasgos: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          lista:  { type: 'string', enum: ['fortalezas', 'desafios'] },
          area:   { type: 'string', enum: NOMBRES_DE_AREA },
          nombre: { type: 'string' },
          origen: { type: 'string' },
        },
        required: ['lista', 'area', 'nombre', 'origen'],
        additionalProperties: false,
      },
    },
  },
  required: ['rasgos'],
  additionalProperties: false,
};

// CADA TEXTO DICE DE QUE RASGO ES, Y SE CASAN POR EL NOMBRE.
//
// Antes se casaban por su sitio en la lista: el primer texto para el primer
// rasgo, y asi. Y se colo un informe con las descripciones corridas tres
// puestos -tres rasgos con el texto de otros y tres sin nada-, porque el modelo
// devolvio dieciocho textos para veintiun rasgos. Un hueco en medio y todo lo
// que venia detras se pego al rasgo equivocado, sin que nada saltara.
//
// Con el nombre delante eso no puede pasar: el texto va al rasgo que nombra, y
// el que no reciba ninguno se queda vacio y se ve, en vez de llevarse el del
// vecino.
const ESQUEMA_DE_ESCRIBIR = {
  type: 'object',
  properties: {
    textos: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          nombre:      { type: 'string' },
          descripcion: { type: 'string' },
          causa:       { type: 'string' },
        },
        required: ['nombre', 'descripcion', 'causa'],
        additionalProperties: false,
      },
    },
  },
  required: ['textos'],
  additionalProperties: false,
};

function comoSeLeHabla(sexo) {
  return sexo === 'mujer'
    ? 'una MUJER. Todo en femenino.'
    : sexo === 'hombre'
      ? 'un HOMBRE. Todo en masculino.'
      : 'una persona que no se identifica como hombre ni como mujer. Evita marcar el genero en los adjetivos.';
}

// ── PASO 1: ELEGIR ──────────────────────────────────────────
async function pedirLosRasgos(nombrePila, sexo, cartaTexto, reloj) {
  const encargo = `Eres astróloga. Lees una carta natal y decides los rasgos de esa persona: los que se le dan bien y los que le cuestan.

AQUÍ NO SE ESCRIBE EL INFORME. Aquí se ELIGE. De cada rasgo sale solo su nombre y de qué posición de la carta lo has sacado; lo que se le cuenta a la persona lo escribe otro después. Por eso puedes dedicarle el rato a lo que de verdad importa: decidir cuáles entran y cuáles no.

TODO SALE DE LA CARTA. No hay ninguna otra fuente. Si algo no se puede sacar de una posición concreta de esta carta, no se escribe.


1. LAS DOS LISTAS, Y LAS DOS DE UNA VEZ

FORTALEZAS: lo que se le da bien, sus dones, sus ventajas, lo que hace bien sin darse cuenta.
DESAFÍOS: lo que le cuesta, lo que le pesa, dónde tropieza.

Las dos se deciden a la vez y con las dos delante. Eso es lo importante: un rasgo puesto en una lista puede estar ya dicho, del revés, en la otra. Lo que se le da bien y lo que le cuesta son muchas veces la misma conducta suya mirada por sus dos caras, y eso solo se ve teniendo las dos listas delante a la vez.


2. CUÁNTOS

Al final, de cada área salen ${POR_AREA.fortalezas.min} o ${POR_AREA.fortalezas.max} fortalezas y ${POR_AREA.desafios.min} o ${POR_AREA.desafios.max} desafíos. Ninguna área se entrega vacía ni por debajo de eso, y ninguna pasa de ahí.

Pero eso es el final, no el principio. Primero sacas de la carta TODO lo que haya de verdad en cada área, sin contar y sin quedarte corta. Después, en el repaso del punto 6, comparas, quitas lo que se repite y te quedas con los que pesan hasta ese número.

Hacerlo al revés -sacar justo los que caben y limpiar después- deja áreas por debajo del suelo, porque al quitar un repetido ya no hay de dónde sacar el que falta.

QUÉ ES QUE UN RASGO PESE: que le esté costando algo de verdad en su vida -tiempo, dinero, salud, gente, calma- o que le esté dando algo de verdad. No que suene bien ni que esté bien escrito. Entre dos que dicen casi lo mismo, se queda el que más le cuesta o más le da, y el otro se va.


3. DE DONDE LOS SACAS

Recorre la carta ENTERA, no solo lo que más salta a la vista. Quedarse en lo evidente deja fuera la mitad de la persona.

El estudio tiene siete áreas y la carta habla de las siete. Las recorres UNA POR UNA y en el orden en que están escritas abajo: te paras en un área, miras lo que hay de ella en ESTA carta, sacas sus rasgos -los que se le dan bien y los que le cuestan- y solo entonces pasas a la siguiente. Ninguna se queda sin los suyos, y de ninguna te saltas la mitad.

No empieces por la lista de aspectos. Es lo más largo que tienes delante y arrastra: se llena la lista con lo que sale de ahí y hay áreas a las que no llegas nunca. Se empieza por el área y se busca lo suyo, que a veces es un aspecto y a veces no.

Esto es lo que hay de cada área:

IDENTIDAD    el Sol, el Ascendente, la casa 1
PATRONES     el Nodo Norte, las casas 6 y 9
MIEDOS       Saturno, Neptuno, Plutón, la casa 12
HERIDA       la Luna, Quirón, la casa 4
AMOR         Venus, las casas 5 y 7
RELACIONES   Mercurio, las casas 3 y 11
DINERO       las casas 2, 8 y 10

En cada una miras todo lo que tienes de eso: en qué signo está y en qué casa cae, qué aspectos forma con los demás, si va retrógrado, y si ahí se junta más de una cosa o la casa está vacía. Cada dato dice algo distinto.

Y EL SIGNO Y LA CASA TIENEN QUE CAMBIAR LO QUE ESCRIBES, no solo lo que pones en "origen". Un mismo cuerpo en dos signos distintos no da el mismo rasgo, y en dos casas distintas tampoco: el cuerpo dice QUÉ le pasa, el signo dice DE QUÉ MANERA le pasa y la casa dice EN QUÉ PARTE DE SU VIDA le pasa. Si te quedas en lo que ese cuerpo significa en general, escribes lo mismo que le escribirías a cualquiera, porque ese cuerpo lo tiene todo el mundo. Lo que no tiene todo el mundo es este cuerpo en este signo, en esta casa y con estos aspectos.
LA PRUEBA: si le cambiaras el signo o la casa a esa posición y el rasgo que has escrito siguiera valiendo igual, es que no lo has escrito de ESTA carta y hay que escribirlo otra vez.

Marte, Urano y Júpiter no llevan área propia: lo que salga de ellos es del área de la casa en la que están.
Al escribirlo, ponle el área de la que lo sacaste; en el repaso del punto 6 se la cambias si al leerlo ves que habla de otra.


4. LAS CASILLAS QUE SE ELIGEN AQUÍ

Todos van en una sola lista, seguidos, y cada uno dice de cuál de las dos listas es y de qué área:

lista        "fortalezas" o "desafios", tal cual.
area         una de las siete, escrita como están escritas arriba.

nombre       Se le habla de tu, igual que en todo lo demás: es lo que hace
             o lo que le pasa, dicho a la persona. No el nombre de eso.
             Un nombre que arranca con un sustantivo y le cuelga adjetivos
             detrás no le habla a nadie, es una etiqueta de manual, y está mal
             aunque describa bien el rasgo.
             De cuatro a siete palabras, con sus artículos y sus preposiciones,
             como se habla. Empieza en mayúscula, y sin punto al final.
origen       De donde sale el rasgo en la carta, en técnico y en corto: el
             cuerpo con su signo y su casa, o los dos cuerpos y el aspecto que
             forman. Nada más: ni explicación ni frase.
             Es obligatoria. Y no repartas todos los rasgos sobre las mismas
             dos o tres posiciones: la carta tiene de sobra.

Un rasgo es su nombre y su posición. Si empiezas uno y no sabes de dónde lo sacas, se quita entero.


6. EL REPASO, ANTES DE ENTREGAR

Esto no es un consejo: es la mitad del trabajo, y va con las dos listas escritas delante.

PRIMERO, LOS QUE NACEN DE LO MISMO. Lees los rasgos de las dos listas, todos, y los comparas de dos en dos.

Y no compares cómo están escritos: compara la conducta que hay debajo. Dos rasgos son el mismo cuando la persona está haciendo lo mismo en los dos, aunque uno hable del trabajo y otro de su casa, aunque estén en áreas distintas y aunque uno esté en fortalezas y el otro en desafíos. La prueba es esta: si al corregir uno el otro se corrige solo, son el mismo. De cada pareja se queda UNO, el que más pese, y el otro se va.

Y así es como se cuela lo repetido: una sola conducta suya se reparte en tres o cuatro rasgos, cada uno contándola en una parcela distinta de su vida. Con nombres distintos parecen cuatro. Son uno. Eso es lo que hay que cazar, y para verlo hay que mirar qué está haciendo ella, no qué palabras se han usado.

Y UN MISMO TERRENO NO SALE EN LAS DOS LISTAS. Si de algo has sacado una fortaleza y también un desafío, no son dos rasgos: es uno con sus dos caras, y quien lo lee ve una contradicción, porque en el informe van en páginas distintas y nada le dice que van juntas. Se queda la cara que más peso tenga hoy en su vida y la otra se va.

DESPUÉS, EL ÁREA DE CADA UNO, Y AQUÍ NO MANDA LA POSICIÓN.

Tapa de dónde lo sacaste. Lee solo el rasgo y pregúntate de qué habla, con la lista de las siete delante. Ahí es donde va, aunque la posición diga otra cosa.

La posición sirvió para encontrarlo; a partir de aquí no decide nada, porque quien lo lee no la ve: solo ve la etiqueta y el texto, juntos. Si los dos no cuadran, la etiqueta está mal y punto.

Ojo con las áreas que en la carta miran a más de una cosa: ahí es donde el rasgo se queda pegado a la posición y acaba con una etiqueta que no habla de lo que él cuenta.

Esto se hace rasgo por rasgo y sin saltarse ninguno: es el paso que más veces sale mal.

DESPUÉS, EL SUELO DE CADA ÁREA. Cuentas, área por área, cuántas fortalezas y cuántos desafíos han quedado. Si alguna se ha quedado por debajo de su mínimo, vuelves a la carta, a la parte que le toca a esa área, y sacas otro rasgo distinto de verdad. No vale rescatar el que acabas de quitar ni escribir una variante suya.

DESPUÉS, EL TECHO. Si un área pasa de su máximo, se quedan los que más pesan y los demás se van.

Y POR ÚLTIMO, DOS COSAS QUE SE MIRAN EN UN MINUTO: que ningún rasgo nombre la carta ni nada técnico en el nombre, la descripción o la causa, y que a ninguno le falte una casilla.

Devuelve solo la lista ya repasada. No expliques lo que has quitado.

Carta natal:
${cartaTexto}

Persona: ${comoSeLeHabla(sexo)}
Nombre de pila: ${nombrePila}`;

  const salida = await alModelo({
    que: 'elegir los rasgos',
    modelo: 'claude-opus-5',
    // PENSANDO, y esta es la unica del informe que lo hace. Es todo el cambio:
    // sin esto no puede comparar, y sin comparar salen los repetidos y las
    // etiquetas cambiadas de sitio.
    //
    // EL ESFUERZO, MEDIO. Estuvo en bajo mientras esta llamada ademas escribia
    // los treinta y tantos rasgos enteros y se comia el reloj. Ya no escribe:
    // devuelve una linea por rasgo, asi que le sobra sitio para pensar. Y aqui
    // es donde se decide todo lo que salia mal -los repetidos y las etiquetas
    // cambiadas de sitio-, que es justo lo que necesita pensarse.
    razona: true,
    techo: 8000,
    system: encargo,
    mensaje: 'Elige los rasgos de esta carta, siguiendo el esquema.',
    molde: ESQUEMA_DE_ELEGIR,
    espera: reloj.senal(TOPE_DE_ELEGIR),
  });

  const rasgos = [];
  for (const r of (Array.isArray(salida.rasgos) ? salida.rasgos : [])) {
    const nombre = String(r?.nombre ?? '').trim();
    const origen = String(r?.origen ?? '').trim();
    if (!nombre) continue;
    rasgos.push({
      nombre, origen,
      // El area la dice el modelo, que es el unico que ha leido el rasgo. Si no
      // la dice, o dice una que no existe, la saca el codigo de la posicion.
      area: areaDelRasgo(origen, String(r?.area ?? '').trim()),
      lista: String(r?.lista ?? '').trim() === 'desafios' ? 'desafios' : 'fortalezas',
    });
  }
  return rasgos;
}

// ── PASO 2: ESCRIBIR ────────────────────────────────────────
//
// Una llamada por lista, las dos a la vez. Que no se vean entre ellas ya no
// importa: lo que se podia pisar se quito al elegir, y aqui solo se redacta lo
// que ya esta decidido.
async function escribirLosRasgos(cual, rasgos, nombrePila, sexo, cartaTexto, reloj) {
  if (rasgos.length === 0) return [];

  const encargo = `Eres astróloga. Se le está escribiendo a una persona el estudio de su carta natal, y te toca la parte de ${cual === 'fortalezas' ? 'lo que se le da bien' : 'lo que le cuesta'}.

AQUÍ NO SE ELIGE NADA. Los rasgos ya están decididos y te los doy abajo con su nombre y con la posición de la carta de la que salen. Tú escribes, de cada uno, sus dos casillas: la descripción y la causa. Ni quitas ninguno, ni añades ninguno, ni cambias un nombre.

Contestas con un texto por rasgo, y en cada uno repites su nombre TAL CUAL te lo doy, sin cambiarle ni una palabra. Es lo que hace que cada texto acabe en su rasgo.

Van todos: si te dejas uno, ese rasgo se cae del informe.

TODO SALE DE LA CARTA Y DEL RASGO. Si algo no se puede sacar de ahí, no se escribe.


LAS DOS CASILLAS QUE ESCRIBES

descripcion  TRES RENGLONES, ni dos ni cuatro. Son unos doscientos sesenta
             caracteres contando los espacios. No se cuentan frases: dos frases
             pueden ocupar cinco renglones.
             TRES ES LA MEDIDA, NO EL TECHO. Con dos se queda a medias: se
             enuncia el rasgo y no da tiempo a que se entienda, y quien lo lee
             pasa al siguiente sin haberse reconocido en ninguno. Si te sale en
             dos, es que le falta una de las cuatro cosas que cuenta.
             Que hace, que le pasa, como se le nota y en qué parte de su vida se
             le nota.

causa        Por que le pasa ESE rasgo en concreto y de donde le viene, que es
             lo que quiere saber. Dos o tres frases.
             ABRE NOMBRANDO LA CAUSA, no describiendo otra vez lo que le pasa:
             "esto sale porque...", "esto viene de que...", "lo que hay detrás
             es que...". Abrir con lo que hace o lo que siente es lo que hace
             que la causa acabe siendo el rasgo dicho de otra manera.
             NO REPITE EL RASGO CON OTRAS PALABRAS. Lo que hace y como se le
             nota ya está arriba, en la descripcion. Aquí se dice que hay
             DETRÁS que lo produce, el mecanismo del que sale.
             DONDE NO PUEDE FALLAR NI UNA ES EN LOS DESAFÍOS.
             Y EL FALLO TÍPICO, en las dos listas, es escribir "se le da bien
             porque le importa", "porque se exige", "porque su cabeza funciona
             así" o "porque le sale natural": eso es el rasgo otra vez con un
             porque delante, y no explica nada. Lo que produce un rasgo nunca
             es el rasgo. Es una manera suya de funcionar que por si sola no
             es ni buena ni mala, y que acaba dando esto.
             PRUEBA ANTES DE ENTREGAR: tapa la descripcion y lee solo la
             causa. Si ahí no hay nada que no estuviera ya en la descripcion,
             esa causa no vale y se escribe la de verdad.
             Y tiene que ser la de ESTE rasgo, no una que valdría igual para
             cualquier otro suyo.
             NI UNA PALABRA TÉCNICA, y aquí es donde más se cuela. Ni en el
             nombre, ni en la descripcion, ni aquí: ningún planeta, ningún
             signo, ninguna casa, ningún aspecto, nada de que algo está en una
             zona de su carta ni de que va retrógrado, y su carta no se nombra.
             Tampoco se nombra el área del estudio de la que sale el rasgo: eso
             es cosa nuestra para ordenarlo, no algo que tenga que leer.
             La posición va en "origen", la casilla de al lado, y no se cuenta
             dos veces. Aquí se explica el mecanismo con sus palabras,
             sin decir de donde has sacado que funciona así.
             Y OJO CON ESTO: una carta natal es el mapa del momento en que
             nació, así que lo que sale de ella lo tiene de nacimiento. Por eso
             no se dice que lo aprendió de pequeña, ni que se lo enseñaron en
             casa, ni que le viene de sus padres, ni se cuenta ningún episodio
             de su vida: eso no está en la carta y sería inventárselo.
             Lo que SÍ está en la carta es la parcela de su vida en la que se
             le nota: la casa en la que cae la posición dice si es su trabajo,
             su dinero, su pareja, su gente, su casa, su cabeza o su cuerpo.
             Esa parcela se dice, con la palabra de siempre y sin nombrar la
             casa. Sin ella el rasgo se queda en como funciona por dentro, que
             es igual en todo el mundo, y quien lo lee no se reconoce en nada.


5. CÓMO SE ESCRIBE

Esto lo lee una persona normal, que no ha estudiado nada de esto y que lo lee una sola vez.

- SE ENTIENDE A LA PRIMERA. Si una frase obliga a volver atrás para entenderla, está mal escrita y se cambia. Esa prueba manda sobre lo bonito que quede.
- SE LE HABLA DE TU, siempre, como quien se lo cuenta tomando un café. Nunca en tercera persona.
- SE CUENTA LO QUE LE PASA EN SU VIDA: lo que hace, lo que piensa, lo que siente, lo que le ocurre un día cualquiera.
- Y SE LE PONE SU VOZ: lo que ella se dice por dentro cuando le pasa eso, dicho con las palabras que usaría ella y no con las de quien la observa. Eso es lo que hace que se reconozca. Sale de lo que dice el rasgo, no de suponerle nada: no se le inventa ningún hecho, ninguna escena ni ninguna frase que no se desprenda de lo que ya se ha contado.
- NO SE HABLA DE PARTES SUYAS COMO SI FUERAN COSAS CON VIDA PROPIA que se mueven, chocan, se construyen o se mezclan. Se dice lo que hace la persona, no lo que hace un concepto.
- Y POR ESO NO SE ESCRIBE "tu manera de", "tu forma de", "tu capacidad de", "una necesidad de", "una tendencia a", "una parte de ti" ni "la parte de ti que". Convierten en cosa lo que ella hace, y quien lee tiene que volver atrás para entenderlo. Donde salga uno de esos, se dice con un verbo lo que hace ella.
- NI DOS NOMBRES NI DOS DESCRIPCIONES QUE EMPIECEN IGUAL. Antes de entregar, lee en columna los nombres de toda la lista, y luego las descripciones: los que arranquen con la misma palabra se escriben otra vez arrancando de otra manera.
- NADA DE METÁFORAS NI IMÁGENES. Se dice la cosa, no una figura de la cosa.
- FRASES LARGAS, ENCADENADAS CON COMAS, y QUE EL TEXTO RESPIRE. Así se habla de verdad. Cortarlo todo en frases secas y en ideas cortas una detrás de otra parte la lectura, suena a lista y ahoga a quien lee, porque no le da tiempo a asimilar una cuando ya le llega la siguiente. Se desarrolla una idea, se le deja sitio, y luego viene la otra.
- LAS PALABRAS SON LAS DE LA CALLE, no las de un informe. Si una palabra la verías antes en una evaluación de trabajo o en un manual que en una conversación, se cambia por la que usaría cualquiera hablando.
- CUANDO ALGO SE LE DA BIEN, SE LE DICE A LA CARA. Se le reconoce directamente, no se describe su rendimiento desde fuera como si se la estuviera puntuando.
- CUANDO ES UN DESAFÍO, SE LE CUENTA SIN ATACARLA. Se dice lo que le pasa de manera que lo reconozca y no se ponga a la defensiva: sin juzgarla, sin señalarla y sin que suene a reproche ni a defecto.
- Español de España, hablado, sin latinoamericanismos.
- Nada de asteriscos, negritas, guiones ni símbolos: es texto corrido.
- A ella no se le pone un diagnóstico: se cuenta lo que le ocurre, no cómo se llama eso.

Carta natal:
${cartaTexto}

Persona: ${comoSeLeHabla(sexo)}
Nombre de pila: ${nombrePila}

LOS RASGOS QUE TE TOCAN, en este orden:
${rasgos.map((r, i) => `${i + 1}. ${r.nombre}  —  sale de: ${r.origen}`).join('\n')}`;

  const salida = await alModelo({
    que: `escribir ${cual}`,
    modelo: 'claude-sonnet-5',
    // Sin razonamiento: aqui no hay nada que decidir, y encendido se gasta el
    // presupuesto pensando en vez de escribir.
    razona: false,
    techo: 16000,
    system: encargo,
    mensaje: `Escribe la descripción y la causa de cada uno de los ${rasgos.length} rasgos. Contesta ${rasgos.length} textos, ni uno menos, cada uno con el nombre de su rasgo.`,
    molde: ESQUEMA_DE_ESCRIBIR,
    espera: reloj.senal(TOPE_DE_ESCRIBIR),
  });

  // Se casan por el nombre, no por el sitio. Se compara en minusculas y sin
  // tildes, que es lo unico que el modelo suele cambiar al copiarlo.
  const porNombre = new Map();
  for (const t of (Array.isArray(salida.textos) ? salida.textos : [])) {
    const clave = comoSeCompara(String(t?.nombre ?? ''));
    if (clave && !porNombre.has(clave)) porNombre.set(clave, t);
  }

  const escritos = rasgos.map(r => {
    const t = porNombre.get(comoSeCompara(r.nombre));
    return {
      nombre: r.nombre,
      descripcion: String(t?.descripcion ?? '').trim(),
      causa: String(t?.causa ?? '').trim(),
      origen: r.origen,
      area: r.area,
    };
  });

  // EL QUE SE QUEDA SIN TEXTO NO SE ENTREGA. Un rasgo con el titulo solo y sin
  // nada debajo se imprime igual en el PDF y se ve a la primera. Vale mas un
  // area con un rasgo menos.
  const enteros = escritos.filter(r => r.descripcion && r.causa);
  if (enteros.length < rasgos.length) {
    console.warn(`${cual}: ${rasgos.length - enteros.length} rasgos se quedaron sin texto y no se entregan`);
  }
  return enteros;
}

// La unica puerta al modelo de este fichero para las listas: mismo trato de los
// fallos y mismo molde, para no tener dos sitios donde cambiar lo mismo.
async function alModelo({ que, modelo, razona, techo, system, mensaje, molde, espera }) {
  const cuerpo = {
    model: modelo,
    max_tokens: techo,
    system,
    output_config: { format: { type: 'json_schema', schema: molde } },
    messages: [{ role: 'user', content: mensaje }],
  };
  if (razona) {
    cuerpo.thinking = { type: 'adaptive' };
    cuerpo.output_config.effort = 'medium';
  } else {
    cuerpo.thinking = { type: 'disabled' };
  }

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    signal: espera,
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify(cuerpo),
  });

  if (!response.ok) {
    const detalle = await response.text();
    const err = new Error(`${que}: ${response.status} — ${detalle.slice(0, 300)}`);
    err.temporal = response.status === 429 || response.status >= 500;
    throw err;
  }

  const data = await response.json();
  const texto = (data.content || [])
    .filter(b => b && b.type === 'text' && typeof b.text === 'string')
    .map(b => b.text)
    .join('');

  try {
    return JSON.parse(texto);
  } catch (e) {
    const err = new Error(`${que}: la respuesta no es JSON valido`);
    err.temporal = true;
    throw err;
  }
}

// Los dos pasos, encadenados: se elige una vez y se escriben las dos listas a
// la vez.
async function pedirLasListas(nombrePila, sexo, cartaTexto, reloj) {
  const elegidos = await pedirLosRasgos(nombrePila, sexo, cartaTexto, reloj);

  const [fortalezas, desafios] = await Promise.all([
    escribirLosRasgos('fortalezas', elegidos.filter(r => r.lista === 'fortalezas'), nombrePila, sexo, cartaTexto, reloj),
    escribirLosRasgos('desafios',   elegidos.filter(r => r.lista === 'desafios'),   nombrePila, sexo, cartaTexto, reloj),
  ]);
  return { fortalezas, desafios };
}

// SE REINTENTA, PERO SOLO SI CABE.
//
// Ahora el informe entero cuelga de esta llamada: si no sale, no hay rasgos. Y
// como tarda mas que las de antes, un reintento a destiempo se come el sitio de
// las siete areas y deja a la clienta sin informe habiendo pagado. Asi que se
// reintenta mientras quepan el segundo intento y las areas detras.
async function sacarLasListas(nombrePila, sexo, cartaTexto, INTENTOS, reloj) {
  let ultimoError;
  for (let intento = 1; intento <= INTENTOS; intento++) {
    try {
      return await pedirLasListas(nombrePila, sexo, cartaTexto, reloj);
    } catch (err) {
      ultimoError = err;
      const temporal = err.temporal !== false;
      if (!temporal || intento === INTENTOS) break;
      // Para reintentar tienen que caber los dos pasos otra vez -elegir y
      // escribir- y las siete areas detras. Si no caben, se avisa: vale mas eso
      // que dejar a la clienta esperando a un intento que tampoco llega.
      if (!reloj.hayTiempoPara(270)) {
        console.warn('Listas: fallo y ya no cabe otro intento con las siete areas detras');
        break;
      }
      console.warn(`Listas: intento ${intento} fallido (${err.message.slice(0, 80)}), reintentando`);
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
  // EL REPETIDO SE QUITA SIEMPRE.
  //
  // Antes se dejaba si al quitarlo el area bajaba del minimo, porque llenarla
  // otra vez costaba una llamada mas y medio minuto de espera. Esa llamada ya
  // no existe: el suelo se lo comprueba el modelo dentro, pensando.
  //
  // Asi que lo unico que se decide aqui es que ve la clienta, y prefiere un
  // area con un rasgo menos que dos titulos iguales seguidos en la misma
  // pagina. Aqui ya no llega casi ninguno; esto es la ultima red.
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

// LOS RASGOS, DE PRINCIPIO A FIN.
//
// Una llamada -la que piensa- y tres redes de codigo detras. Las redes no
// opinan: cuentan y comparan cadenas. Estan porque el modelo se despista, no
// porque decidan nada.
async function sacarRasgos(nombrePila, sexo, cartaTexto, INTENTOS, reloj) {
  // 1. Las dos listas, ya comparadas entre si, etiquetadas y con su suelo y su
  //    techo por area. Todo lo que antes eran cinco llamadas.
  let { fortalezas, desafios } = await sacarLasListas(nombrePila, sexo, cartaTexto, INTENTOS, reloj);

  // 2. RED: fuera el que le nombra la carta a la clienta. El encargo lo prohibe
  //    y aun asi se cuela alguno; esto no es criterio, son palabras que se
  //    buscan y se ven.
  const limpios = lista => {
    const quedan = lista.filter(r => !hablaDeAstrologia(r));
    if (quedan.length < lista.length) {
      console.warn(`${lista.length - quedan.length} rasgos nombraban la carta a la clienta, se quitan`);
    }
    return quedan;
  };
  fortalezas = limpios(fortalezas);
  desafios = limpios(desafios);

  // 3. RED: dos rasgos con el mismo titulo son el mismo rasgo dicho dos veces.
  //    Comparar dos cadenas no se le pregunta a nadie.
  [fortalezas, desafios] = sinTituloRepetido(fortalezas, desafios);

  // 4. RED: el techo por area. Si sobran, se quedan los primeros, que es el
  //    orden en que el encargo le pide escribirlos: primero los que mas pesan.
  const conSuTecho = (lista, cual) => {
    const tope = POR_AREA[cual].max;
    const salen = [];
    for (const area of NOMBRES_DE_AREA) {
      const suyos = lista.filter(r => r.area === area);
      if (suyos.length > tope) console.warn(`${cual} en ${area}: ${suyos.length}, se dejan ${tope}`);
      salen.push(...suyos.slice(0, tope));
    }
    // Los que no llevan area reconocida no se pierden: van al final.
    salen.push(...lista.filter(r => !NOMBRES_DE_AREA.includes(r.area)));
    return salen;
  };
  fortalezas = conSuTecho(fortalezas, 'fortalezas');
  desafios = conSuTecho(desafios, 'desafios');

  // 5. Y si aun asi alguna area se ha quedado corta, se deja aviso. Ya no se
  //    pide relleno: eso era una llamada mas que ademas se saltaba cuando el
  //    reloj apretaba. Ahora el suelo se lo comprueba el modelo pensando, que
  //    es cuando de verdad puede volver a la carta a buscar otro.
  for (const [cual, lista] of [['fortalezas', fortalezas], ['desafios', desafios]]) {
    const cortas = NOMBRES_DE_AREA.filter(a => lista.filter(r => r.area === a).length < POR_AREA[cual].min);
    if (cortas.length) console.warn(`${cual}: por debajo del minimo en ${cortas.join(', ')}`);
  }

  // 6. Ordenados por area, que es como los pinta el PDF. El rasgo cuya posicion
  //    no se reconoce se queda sin area y va al final, que es donde menos se
  //    nota que no lleva etiqueta.
  const sitio = r => (NOMBRES_DE_AREA.indexOf(r.area) + 1) || NOMBRES_DE_AREA.length + 1;
  const porArea = (a, b) => sitio(a) - sitio(b);
  fortalezas = fortalezas.slice().sort(porArea);
  desafios = desafios.slice().sort(porArea);

  // UNA SOLA LISTA PARA LAS DOS COSAS. Antes habia dos: la entera para el PDF y
  // otra recortada para las areas, porque la entera traia hasta cuarenta rasgos
  // y no cabian en el texto. Ahora sale ya con los que caben, asi que la clienta
  // lee en el PDF exactamente los mismos con los que se ha escrito su informe.
  return { fortalezas, desafios };
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
