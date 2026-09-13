// ═══════════════════════════════════════════════════════════════
// api/prueba-regalo/llamadas.js
//
// LAS CUATRO LLAMADAS DEL REGALO, ENCADENADAS Y CON SUS REINTENTOS.
//
// Es la misma maquinaria del P1 -el reloj, los reintentos, las redes y los
// topes-, copiada de api/chat.js. Alli no se toca nada: esto es una copia
// aparte para el trozo gratis.
//
// LOS ENCARGOS SON LOS DEL P1, copiados enteros, con lo justo cambiado porque
// aqui solo hay un area -IDENTIDAD- y el texto acaba en el porque, no en el
// cierre.
// ═══════════════════════════════════════════════════════════════

import { TONO, SYSTEM_PROMPT } from './tono.js';

// ═══════════════════════════════════════════════════════════════
// LO QUE SE BUSCA, Y CUANTO
// ═══════════════════════════════════════════════════════════════

// Una sola area, y es la primera del informe.
const EL_AREA = 'IDENTIDAD';

// Los mismos topes por area que el P1.
const POR_AREA = {
  fortalezas: { min: 1, max: 2 },
  desafios:   { min: 2, max: 3 },
};

const CUANTOS_RASGOS = POR_AREA.fortalezas.max + POR_AREA.desafios.max;   // 5

// ═══════════════════════════════════════════════════════════════
// EL RELOJ DE LA PETICION. Copiado del P1.
//
// Vercel corta la funcion a los 300 segundos. El reloj arranca al entrar la
// peticion, le pone tope a cada llamada -y nunca mas de lo que quede- y
// decide si un reintento cabe. No anade ni una llamada: las quita cuando el
// tiempo aprieta.
// ═══════════════════════════════════════════════════════════════

const TOPE_DE_LA_PETICION = 285000;   // 15 segundos por debajo del corte de Vercel

export function crearReloj(margen = TOPE_DE_LA_PETICION) {
  const fin = Date.now() + margen;
  // EL CUADERNO. Solo sirve para poder mirar despues que ha hecho cada llamada,
  // cuanto ha tardado y que ha quitado la limpieza. No decide NADA.
  const cuaderno = { tiempos: [], entraron: [], quitaLimpieza: [], devueltos: [], escritos: [] };
  return {
    quedan: () => fin - Date.now(),
    senal: tope => AbortSignal.timeout(Math.max(1000, Math.min(tope, fin - Date.now()))),
    hayTiempoPara: segundos => (fin - Date.now()) > segundos * 1000,
    cuaderno,
    apunta: (que, arranque) => {
      const segundos = Math.round((Date.now() - arranque) / 100) / 10;
      cuaderno.tiempos.push({ que, segundos });
      console.log(`[regalo] ${que}: ${segundos} s`);
    },
  };
}

// ═══════════════════════════════════════════════════════════════
// HABLAR CON EL MODELO. Copiado del P1.
//
// Un fallo de red o un 429 vienen marcados como temporales, que es lo que
// mira quien reintenta. Si lo que vuelve no es JSON tambien es temporal: el
// modelo se ha cortado a medias y volver a pedirlo suele arreglarlo.
// ═══════════════════════════════════════════════════════════════

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
    cuerpo.output_config.effort = razona;
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

function comoSeLeHabla(sexo) {
  return sexo === 'mujer'
    ? 'una MUJER. Todo en femenino.'
    : sexo === 'hombre'
      ? 'un HOMBRE. Todo en masculino.'
      : 'una persona que no se identifica como hombre ni como mujer. Evita marcar el genero en los adjetivos.';
}


// ═══════════════════════════════════════════════════════════════
// LAS REDES DE CODIGO. Copiadas del P1.
//
// No opinan: cuentan y comparan cadenas. Estan porque el modelo se despista,
// no porque decidan nada.
// ═══════════════════════════════════════════════════════════════

const MARCAS_DE_RELLENO = [
  /^\s*(placeholder|lorem ipsum|texto de ejemplo|por completar|por escribir|sin contenido|n\/?a|tbd)\b/i,
  /\bplaceholder\b/i,
  /\blorem ipsum\b/i,
  /^\s*[.\-\u2013\u2014_]+\s*$/,
  /^\s*\[[^\]]*\]\s*$/,
];
const esRelleno = txt => MARCAS_DE_RELLENO.some(re => re.test(String(txt || '')));

// Lo que se queda a media frase. Se mira al reves de pedir el punto: solo lo
// que no puede cerrar una frase nunca. Los guiones no entran: un inciso puede
// cerrarse con su guion al final y eso es un final bueno.
const acabaColgado = txt => /[\p{L}\p{N},;:\u00ab\u00bf\u00a1([\u201c\u2018]$/u.test(String(txt || '').trim());

function sinTildes(txt) {
  return String(txt || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

// LO QUE LA CLIENTA NO PUEDE LEER. El encargo prohibe las palabras de
// astrologia y aun asi se cuelan, asi que se comprueba. Solo se buscan las que
// en castellano no significan otra cosa.
const PALABRAS_DE_ASTROLOGIA = [
  /\b(mercurio|jupiter|saturno|urano|neptuno|pluton|quiron|ascendente)\b/,
  /\bnodo (norte|sur)\b/,
  /\b(aries|tauro|geminis|virgo|escorpio|sagitario|capricornio|acuario|piscis)\b/,
  /\ben (cancer|leo|libra)\b/,
  /\b(tu|su|la|mi) carta\b/,
  /\b(carta|mapa) (natal|astral)\b/,
  /\bretrograd[oa]\b/,
  /\bcasa \d{1,2}\b/,
  /\b(conjuncion|oposicion|cuadratura|trigono|sextil) (a|con|al)?\s*(el|la)?\s*(mercurio|jupiter|saturno|urano|neptuno|pluton|quiron|sol|luna|venus|marte)\b/,
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


// ═══════════════════════════════════════════════════════════════
// 1a LLAMADA — SACAR LOS RASGOS · Opus, pensando medio
//
// Recibe: la carta natal entera, con las casas.
// Entrega: 5 rasgos (2 fortalezas y 3 desafios). De cada uno: si es fortaleza
//          o desafio, la conducta, el area y de que posicion de la carta sale.
//
// POR SI ACASO, HASTA 2 LLAMADAS MAS:
//   - si falla, se repite pensando menos;
//   - si vuelven menos de 5, se pide la lista ENTERA otra vez y se queda la
//     mejor de las dos.
// ═══════════════════════════════════════════════════════════════

const TOPE_DE_ELEGIR = 100000;

const ESQUEMA_DE_ELEGIR = {
  type: 'object',
  properties: {
    rasgos: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          lista:    { type: 'string', enum: ['fortalezas', 'desafios'] },
          // LA CONDUCTA: lo que HACE la persona en ese rasgo. No la lee la
          // clienta: es con lo que compara la limpieza. Dos rasgos con la misma
          // conducta son el mismo rasgo, aunque esten escritos distinto.
          conducta: { type: 'string' },
          area:     { type: 'string', enum: [EL_AREA] },
          origen:   { type: 'string' },
        },
        required: ['lista', 'conducta', 'area', 'origen'],
        additionalProperties: false,
      },
    },
  },
  required: ['rasgos'],
  additionalProperties: false,
};

// EL ENCARGO. Es el del P1, copiado entero, con lo justo cambiado para que
// busque solo en IDENTIDAD y saque cinco rasgos en vez de treinta y cinco.
// Lo que no habla de repartir entre siete areas esta igual, palabra por
// palabra: el peso, que todo salga de la carta, las casillas de cada rasgo y
// el no repetirse ni contradecirse.
const ENCARGO_DE_ELEGIR = `Eres astróloga. Lees una carta natal y decides los rasgos de esa persona: los que se le dan bien y los que le cuestan.
AQUÍ SOLO SE BUSCAN, NO SE ESCRIBEN: De cada rasgo sale si es una fortaleza o un desafío, su conducta, el área a la que pertenece y de qué posición de la carta lo has sacado. Ni título, ni descripción, ni causa: eso lo escribe otro después.  
QUÉ ES QUE UN RASGO PESE: que le esté costando algo de verdad en su vida -tiempo, dinero, salud, gente, calma- o que le esté dando algo de verdad. No que suene bien ni que esté bien escrito. Entre dos que dicen casi lo mismo, se queda el que más le cuesta o más le da, y el otro se va.
TODO SALE DE LA CARTA. No hay ninguna otra fuente. Si algo no se puede sacar de una posición concreta de esta carta, no se escribe.

1. LO QUE BUSCAS
FORTALEZAS: lo que se le da bien, sus dones, sus ventajas, lo que hace bien sin darse cuenta.
DESAFÍOS: lo que le cuesta, lo que le pesa, dónde tropieza.
Sacas las fortalezas y los desafíos a la vez, todos seguidos, y cada rasgo dice cuál de las dos cosas es. 

2. CUÁNTOS
Sacas 2 fortalezas y 3 desafíos, ni una más ni una menos. Todos de IDENTIDAD: quién es por dentro y cómo se vive a sí mismo o a sí misma.


3. DE DONDE LOS SACAS

Mira TODO lo que tienes de esta área, no solo lo que más salta a la vista. Quedarse en lo evidente deja fuera la mitad de la persona.
No empieces por la lista de aspectos. Es lo más largo que tienes delante y arrastra: se llena la lista con lo que sale de ahí y no llegas nunca a lo que de verdad buscas. Se empieza por lo del área y se busca lo suyo, que a veces es un aspecto y a veces no.

Esto es lo que hay de esta área:

IDENTIDAD    el Sol, el Ascendente, la casa 1

Ahí miras todo lo que tienes de eso: en qué signo está y en qué casa cae, qué aspectos forma con los demás, si va retrógrado, y si ahí se junta más de una cosa o la casa está vacía. Cada dato dice algo distinto.

Y EL SIGNO Y LA CASA TIENEN QUE CAMBIAR LO QUE ESCRIBES, no solo lo que pones en "origen". Un mismo cuerpo en dos signos distintos no da el mismo rasgo, y en dos casas distintas tampoco: el cuerpo dice QUÉ le pasa, el signo dice DE QUÉ MANERA le pasa y la casa dice EN QUÉ PARTE DE SU VIDA le pasa. Si te quedas en lo que ese cuerpo significa en general, escribes lo mismo que le escribirías a cualquiera, porque ese cuerpo lo tiene todo el mundo. Lo que no tiene todo el mundo es este cuerpo en este signo, en esta casa y con estos aspectos.
LA PRUEBA: si le cambiaras el signo o la casa a esa posición y el rasgo que has escrito siguiera valiendo igual, es que no lo has escrito de ESTA carta y hay que escribirlo otra vez.

Y si Marte, Urano o Júpiter caen en la casa 1, lo que salga de ellos también es de aquí.


4. LAS CASILLAS DE CADA RASGO
Todos van en una sola lista, seguidos, y cada uno lleva sus cuatro casillas llenas: 
lista         si ese rasgo es una fortaleza o un desafío. 

conducta    El rasgo en corto, de cuatro a siete palabras: lo que hace esa
persona o lo que le pasa por dentro. No de qué habla ni dónde le pasa.
No es para quien lee, es para comparar: dos rasgos con la misma
conducta son el mismo rasgo, aunque estén escritos distinto.
Se escribe con las mismas palabras siempre que la conducta sea la misma. Si buscas variar, dejan de verse los repetidos. 

area         siempre IDENTIDAD, escrita así, en mayúsculas.

origen       De donde sale el rasgo en la carta, en técnico y en corto: el
             cuerpo con su signo y su casa, o los dos cuerpos con su signo y su
             casa cada uno y el aspecto que forman. Nada más: ni explicación ni
             frase.
             Es obligatoria. Y no saques los cinco rasgos de la misma
             posición: entre el Sol, el Ascendente, lo que haya en la casa 1
             y los aspectos de los tres, hay de sobra.

Un rasgo es su conducta y su posición. Si empiezas uno y no sabes de dónde lo sacas, se quita entero. 

5. NO SE REPITE NI SE CONTRADICE, Y ESO SE COMPRUEBA MIENTRAS ESCRIBES

Esto no es un repaso del final. Se hace rasgo a rasgo, ANTES de escribir cada uno.

PONLE NOMBRE A LA CONDUCTA. Antes de escribir un rasgo, nombra su conducta, que es la casilla de arriba: lo que hace esa persona o lo que le pasa por dentro, de cuatro a siete palabras. 

Y ANTES DE ESCRIBIRLO, MÍRALO CONTRA LOS QUE YA LLEVAS. Comparas conductas, no palabras. Da igual que uno hable de su trabajo y otro de su casa, o que uno sea una fortaleza y el otro un desafío.

LA PRUEBA: si al corregir uno el otro se corrige solo, son el mismo rasgo.

SI YA ESTÁ, NO LO ESCRIBES. Vuelves a la carta, al Sol, al Ascendente y a la casa 1, y sacas otro distinto de verdad. No vale una variante del que acabas de descartar.

Y UNA MISMA CONDUCTA NO SALE EN LAS DOS LISTAS. Si lo que ibas a escribir como desafío es la misma conducta que ya has escrito como fortaleza, no son dos rasgos: es uno con sus dos caras. Se queda la que más pese hoy en su vida, y la otra no se escribe.

LLEVA LA CUENTA. Ten presentes las conductas que ya has nombrado, desde la primera hasta la última. Los repetidos se cuelan al final de la lista, cuando ya has escrito muchos y dejas de mirar atrás.

6. DE QUÉ HABLA CADA UNO, Y AQUÍ NO MANDA LA POSICIÓN. 

Tapa de dónde lo sacaste. Lee solo el rasgo y pregúntate si de verdad habla de quién es por dentro y de cómo se vive a sí mismo o a sí misma. Si habla de otra cosa -de su dinero, de su pareja, de lo que repite sin darse cuenta, de lo que le da miedo-, no es de aquí y no se escribe.

La posición sirvió para encontrarlo; a partir de aquí no decide nada, porque quien lo lee no la ve: solo ve el texto.

Esto se hace rasgo por rasgo y sin saltarse ninguno: es el paso que más veces sale mal.

DESPUÉS, LA CUENTA. Cuentas cuántas fortalezas y cuántos desafíos has sacado. Si te falta alguna, vuelves a la carta, al Sol, al Ascendente y a la casa 1, y sacas otra distinta de verdad. No vale escribir una variante de una que ya tienes. 

DESPUÉS, EL TECHO. Si te pasas de dos fortalezas o de tres desafíos, se quedan los que más pesan y los demás se van.

Y POR ÚLTIMO, DOS COSAS QUE SE MIRAN EN UN MINUTO: que ninguna conducta nombre la carta ni nada técnico ni de astrología, y que a ningún rasgo le falte una casilla. 
Devuelve solo la lista.`;

function encargoDeElegir(nombrePila, sexo, cartaTexto) {
  return `${ENCARGO_DE_ELEGIR}
Carta natal:
${cartaTexto}
Persona: ${comoSeLeHabla(sexo)}
Nombre de pila: ${nombrePila}`;
}

async function pedirLosRasgos(nombrePila, sexo, cartaTexto, reloj, esfuerzo = 'medium') {
  const arranque = Date.now();
  const salida = await alModelo({
    que: `sacar los rasgos (${esfuerzo})`,
    modelo: 'claude-opus-5',
    razona: esfuerzo,
    // EL MISMO TECHO QUE EL P1. No es lo que escribe -que son cinco rasgos
    // cortos-: es que pensar sale tambien de aqui, y apretarlo le corta el
    // pensamiento a la mitad.
    techo: 32000,
    system: encargoDeElegir(nombrePila, sexo, cartaTexto),
    mensaje: 'Elige los rasgos de esta carta, siguiendo el esquema.',
    molde: ESQUEMA_DE_ELEGIR,
    espera: reloj.senal(TOPE_DE_ELEGIR),
  });
  reloj.apunta(`sacar los rasgos (${esfuerzo})`, arranque);

  const rasgos = (Array.isArray(salida?.rasgos) ? salida.rasgos : [])
    .filter(r => r && r.lista && r.conducta && r.area && r.origen);
  return rasgos;
}

async function unaListaDeRasgos(nombrePila, sexo, cartaTexto, reloj) {
  let rasgos;
  try {
    rasgos = await pedirLosRasgos(nombrePila, sexo, cartaTexto, reloj, 'medium');
  } catch (err) {
    if (err.temporal === false || !reloj.hayTiempoPara(180)) throw err;
    console.warn(`la tirada con esfuerzo medio fallo (${err.message.slice(0, 80)}), se repite pensando menos`);
    return await pedirLosRasgos(nombrePila, sexo, cartaTexto, reloj, 'low');
  }

  // Y SI VUELVE CORTA, SE PIDE OTRA VEZ ENTERA. No se le puede pedir solo los
  // que faltan: los compara entre ellos mientras los escribe, y sin ver los que
  // ya hay los repetiria. Se queda la mejor de las dos, nunca la ultima por ser
  // la ultima.
  if (rasgos.length < CUANTOS_RASGOS && reloj.hayTiempoPara(180)) {
    console.warn(`la 1a llamada ha devuelto ${rasgos.length} rasgos de ${CUANTOS_RASGOS}, se pide otra vez`);
    try {
      const otra = await pedirLosRasgos(nombrePila, sexo, cartaTexto, reloj, 'medium');
      if (otra.length > rasgos.length) rasgos = otra;
    } catch (err) {
      console.warn(`la segunda tirada no ha salido (${err.message.slice(0, 80)}), se sigue con la primera`);
    }
  }
  return rasgos;
}


// ═══════════════════════════════════════════════════════════════
// 2a LLAMADA — LA LIMPIEZA · Opus, pensando alto
//
// Recibe: solo los 5. Numero, tipo, area y conducta. NO VE LA CARTA.
// Entrega: numeros. Cuales se quedan y cuales se quitan.
//
// AQUI NO SE ESCRIBE NI UNA PALABRA. El texto ya lo tiene guardado el codigo
// del paso anterior y lo recupera por el numero, asi que de aqui no puede
// salir un rasgo con la descripcion cambiada.
//
// POR SI ACASO, NINGUNA LLAMADA MAS: si se cae, se sigue con los 5. Un texto
// con algun rasgo repetido es peor que uno limpio, pero es muchisimo mejor
// que ninguno.
// ═══════════════════════════════════════════════════════════════

const TOPE_DE_LIMPIAR = 90000;

const ESQUEMA_DE_LIMPIAR = {
  type: 'object',
  properties: {
    sequedan: { type: 'array', items: { type: 'integer' } },
    sequitan: { type: 'array', items: { type: 'integer' } },
    // POR CADA UNO QUE QUITA, CON CUAL REPITE. Sin esta casilla no se le
    // puede comprobar nada: es la que convierte "lo he quitado" en "lo he
    // quitado porque el 3 cuenta lo mismo".
    parejas: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          seva:    { type: 'integer' },
          sequeda: { type: 'integer' },
        },
        required: ['seva', 'sequeda'],
        additionalProperties: false,
      },
    },
  },
  required: ['sequedan', 'sequitan', 'parejas'],
  additionalProperties: false,
};

// LO QUE SE LE ENSENA PARA COMPARAR, Y NADA MAS. El numero, si es fortaleza o
// desafio, el area y la conducta. Lo demas no hace falta para decidir si dos
// rasgos dicen lo mismo, y todo lo que se le manda de mas es sitio que le
// quita a lo que si tiene que leer.
function laListaNumerada(rasgos) {
  return rasgos
    .map((r, i) => `${i + 1}. ${r.lista === 'fortalezas' ? 'FORTALEZA' : 'DESAFÍO'} — ${r.area} — ${r.conducta}`)
    .join('\n');
}

// EL ENCARGO. Era el del P1 copiado entero, y aqui hacia dano: alli le llegan
// treinta y tantos rasgos de siete areas y si hay repetidos, pero aqui le
// llegan cinco de una sola area. Las ordenes de quitar por parecido, por
// contradiccion y juntando las dos caras de una misma cosa le hacian emparejar
// conductas distintas -todo habla de quien es- y cortar los rasgos de mas peso.
// Ahora solo queda un motivo para quitar, el calco, y tiene que ensenarlo.
const ENCARGO_DE_LIMPIAR = `Abajo tienes las fortalezas y los desafíos interiores de una persona. Cada uno está escrito por separado, enumerado, dice si es una fortaleza o un desafío y su conducta. Todos son de la misma área, IDENTIDAD: quién es por dentro y cómo se vive a sí mismo o a sí misma.
QUÉ SE QUITA, Y SOLO ESTO
Un rasgo se quita SOLO cuando otro de la lista cuenta LA MISMA CONDUCTA. La misma, no una parecida: lo que hace esa persona es lo mismo, dicho con otras palabras. De esos dos se queda uno, el que más pese, y el otro se va.
Pesa más la conducta más concreta y central para la persona, no la más genérica.
Se comparan las fortalezas entre sí y los desafíos entre sí. Una fortaleza y un desafío nunca se quitan el uno al otro.

SI NO HAY DOS QUE CUENTEN LA MISMA CONDUCTA, NO SE QUITA NADA Y SE QUEDAN TODOS.
Que dos rasgos se parezcan, hablen del mismo tema, vayan juntos o suenen a dos caras de una misma cosa NO es motivo para quitar ninguno. Que uno diga lo contrario del otro tampoco. Si dudas, se quedan los dos: quitar de más le arranca a esta persona algo suyo y no hay manera de devolvérselo.

Y POR CADA UNO QUE QUITAS, DICES CON CUÁL REPITE
No se puede quitar un rasgo sin enseñar el que cuenta esa misma conducta. Si no puedes nombrar su número, ese rasgo no se quita. 


LO QUE NO SE PUEDE QUEDAR CORTO
Tienen que quedar al menos 1 fortaleza y 2 desafíos. Si al quitar uno se bajaría de ahí, ese no se quita: se queda aunque repita.
No es un número al que llegar: si quedan más y no se repiten entre ellos, se quedan todos.

LO QUE DEVUELVES
"sequedan": los números de los que se quedan, en el orden de abajo.
 "sequitan": los números de los que quitas.
 "parejas": una entrada por cada número que hay en "sequitan", y ninguna más. En cada una, "seva" es el número del rasgo que se va y "sequeda" es el número del rasgo que cuenta esa misma conducta y se queda. Si "sequitan" está vacía, "parejas" también.
Cada número tiene que quedar en una sola, nunca en las 2. Todos los números de la lista tienen que aparecer en "sequedan" o en "sequitan", ninguno se queda fuera y ninguno se repite en las dos. `;

async function limpiarLosRasgos(rasgos, reloj) {
  const arranque = Date.now();
  const salida = await alModelo({
    que: 'limpiar los rasgos',
    modelo: 'claude-opus-5',
    // PIENSA BAJO, Y SOBRA. Pensar se paga como lo escrito y aqui el modelo es
    // el caro, asi que el esfuerzo alto costaba dinero de verdad. Con el
    // trabajo que le queda -mirar si dos frases cortas cuentan lo mismo, y sin
    // poder quitar nada sin ensenar con cual repite- el esfuerzo bajo llega.
    razona: 'low',
    // El techo es holgado y no por lo que escribe -que son unos pocos numeros-,
    // sino porque pensar tambien gasta de aqui.
    techo: 16000,
    // LA LISTA VA DENTRO DEL ENCARGO, igual que en el P1, y el mensaje es una
    // frase fija.
    system: `${ENCARGO_DE_LIMPIAR}\n\n\nLA LISTA:\n\n${laListaNumerada(rasgos)}`,
    mensaje: 'Di cuáles se quedan y cuáles se quitan, siguiendo el esquema.',
    molde: ESQUEMA_DE_LIMPIAR,
    espera: reloj.senal(TOPE_DE_LIMPIAR),
  });
  reloj.apunta('limpiar los rasgos', arranque);

  // Solo numeros que existan, sin repetir y en el orden de la lista.
  const validos = new Set(rasgos.map((_, i) => i + 1));
  const sequedan = [...new Set((Array.isArray(salida?.sequedan) ? salida.sequedan : [])
    .map(Number).filter(n => validos.has(n)))].sort((a, b) => a - b);

  const pedidos = [...new Set((Array.isArray(salida?.sequitan) ? salida.sequitan : [])
    .map(Number).filter(n => validos.has(n) && !sequedan.includes(n)))].sort((a, b) => a - b);

  // SI SE DEJA ALGUNO SIN CLASIFICAR, SE QUEDA. Un rasgo que no esta ni en una
  // lista ni en la otra es un descuido suyo, no una decision: tirarlo seria
  // quitarle a la clienta algo que nadie ha decidido quitar.
  const olvidados = [...validos].filter(n => !sequedan.includes(n) && !pedidos.includes(n));
  if (olvidados.length) {
    console.warn(`la limpieza no ha dicho nada de ${olvidados.join(', ')}: se quedan`);
  }

  // CADA QUITADA TIENE QUE ENSENAR SU GEMELO, Y SI NO, SE ANULA.
  //
  // Sin esto, quitar depende de que el modelo se porte bien, y es justo ahi
  // donde falla: se lleva rasgos distintos creyendo que son el mismo. Para
  // llevarse uno tiene que decir con cual repite, y ese numero tiene que
  // existir y tiene que quedarse. Si no, el rasgo vuelve.
  // Y EL GEMELO TIENE QUE SER DE SU MISMA LISTA. Una fortaleza y un desafio
  // no son la misma conducta contada dos veces, son dos rasgos. Emparejarlos
  // es lo que se llevaba por delante los de mas peso.
  const gemelos = new Map();
  for (const p of (Array.isArray(salida?.parejas) ? salida.parejas : [])) {
    const seva = Number(p?.seva);
    const sequeda = Number(p?.sequeda);
    if (!validos.has(seva) || !validos.has(sequeda) || seva === sequeda) continue;
    if (rasgos[seva - 1].lista !== rasgos[sequeda - 1].lista) continue;
    if (!gemelos.has(seva)) gemelos.set(seva, sequeda);
  }

  const sequitan = [];
  const anulados = [];
  for (const n of pedidos) {
    const gemelo = gemelos.get(n);
    // El gemelo tiene que quedarse: si tambien se lo lleva, esa conducta no
    // la recoge nadie y la quitada no vale.
    if (gemelo == null || pedidos.includes(gemelo)) anulados.push(n);
    else sequitan.push(n);
  }
  if (anulados.length) {
    console.warn(`la limpieza quiso quitar ${anulados.join(', ')} sin ensenar con cual repite: vuelven`);
  }

  // Se queda todo lo que no se va de verdad: lo que dijo que se quedaba, lo
  // que se dejo sin clasificar y lo que se le ha anulado.
  return { sequedan: [...validos].filter(n => !sequitan.includes(n)).sort((a, b) => a - b), sequitan };
}

// SIN LLAMAR A NADIE, Y GRATIS: EL SUELO.
//
// Si la limpieza dejo las fortalezas o los desafios por debajo de su minimo,
// se devuelven los que hagan falta hasta cubrirlo. El encargo ya se lo pide,
// y aun asi a veces no obedece: si se queda sin fortalezas, el texto sale
// cojo.
function conElSuelo(sequedan, todos, reloj) {
  const dentro = new Set(sequedan);
  const devueltos = [];
  for (const cual of ['fortalezas', 'desafios']) {
    const hay = sequedan.filter(r => r.lista === cual).length;
    let faltan = POR_AREA[cual].min - hay;
    if (faltan <= 0) continue;
    const antes = devueltos.length;
    for (const r of todos) {
      if (faltan === 0) break;
      if (dentro.has(r) || r.lista !== cual) continue;
      dentro.add(r); devueltos.push(r); faltan--;
    }
    console.warn(`la limpieza dejo ${cual} en ${hay} de ${POR_AREA[cual].min}, se devuelven ${devueltos.length - antes}`);
  }
  reloj.cuaderno.devueltos = devueltos.map(r => todos.indexOf(r) + 1);
  return devueltos.length ? [...sequedan, ...devueltos] : sequedan;
}

// SI LA LIMPIEZA SE CAE, SE SIGUE CON TODOS.
async function limpiarYSuelo(todos, reloj) {
  if (todos.length === 0) return [];

  let sequedan;
  try {
    const salida = await limpiarLosRasgos(todos, reloj);
    sequedan = salida.sequedan.map(n => todos[n - 1]).filter(Boolean);
    reloj.cuaderno.quitaLimpieza = salida.sequitan;
    console.log(`de ${todos.length} rasgos se quedan ${sequedan.length}`);
  } catch (err) {
    console.warn(`la limpieza se ha caido (${err.message.slice(0, 80)}), se sigue con los ${todos.length} rasgos`);
    return todos;
  }

  return conElSuelo(sequedan, todos, reloj);
}


// ═══════════════════════════════════════════════════════════════
// 3a LLAMADA — ESCRIBIR LOS RASGOS · Sonnet, pensando bajo · UNA SOLA
//
// Recibe: los que hayan quedado, en crudo.
// Entrega: titulo, descripcion y causa de cada uno.
//
// UNA SOLA LLAMADA, NO DOS. El P1 parte la lista por la mitad porque son
// treinta y tantos rasgos y no caben en una. Con cinco sobra sitio.
//
// SONNET Y NO OPUS: aqui no se decide nada, los rasgos ya estan elegidos y
// comparados. Es escribir.
//
// Y RAZONANDO BAJO: convertir una posicion de la carta en algo que la clienta
// reconoce de su vida es trabajo de astrologa, no de copista. Sin pensar nada
// sale generico.
//
// POR SI ACASO, HASTA 2 LLAMADAS MAS: si vuelven menos escritos de los que se
// pidieron, se repite y se queda la mejor, nunca la ultima por ser la ultima.
// ═══════════════════════════════════════════════════════════════

const TOPE_DE_ESCRIBIR = 90000;
const INTENTOS_DE_ESCRIBIR = 3;

const ESQUEMA_DE_ESCRIBIR = {
  type: 'object',
  properties: {
    rasgos: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          // EL NUMERO ES LO QUE LOS ATA. El modelo devuelve solo lo que ha
          // escrito, asi que el codigo lo vuelve a juntar con su conducta, su
          // area y su lista por ese numero.
          n:           { type: 'integer' },
          titulo:      { type: 'string' },
          descripcion: { type: 'string' },
          causa:       { type: 'string' },
        },
        required: ['n', 'titulo', 'descripcion', 'causa'],
        additionalProperties: false,
      },
    },
  },
  required: ['rasgos'],
  additionalProperties: false,
};

// LO QUE SE LE DA DE CADA RASGO, Y NADA MAS. Van numerados del uno en adelante.
function losRasgosSinEscribir(rasgos) {
  return rasgos
    .map((r, i) => `${i + 1}. ${r.lista === 'fortalezas' ? 'FORTALEZA' : 'DESAFÍO'} — ${r.area} — ${r.conducta} — ${r.origen}`)
    .join('\n');
}

// EL ENCARGO. Es el del P1, copiado entero. Solo cambia una frase, la que
// decia que de cada rasgo le dan el area a la que pertenece: aqui todos son
// de IDENTIDAD. Lo demas esta igual, palabra por palabra, porque va de como
// se escribe un rasgo suelto y eso no depende de cuantas areas haya.
//
// El tono va delante y los rasgos detras, los dos los pega la llamada, igual
// que en el P1.
const ENCARGO_DE_ESCRIBIR = `Eres astróloga y experta en psicología y neurociencia. Lees una posición de una carta natal y la conviertes en algo que esa persona reconoce de su vida.
AQUÍ NO SE ELIGE NADA. Los rasgos ya están decididos y comparados. Tú los escribes, ni quitas ni añades ni cambias cuál es cuál.
DE CADA RASGO TE DAN: su número, si es una fortaleza o un desafío, su conducta y la posición de la carta de la que sale. Todos son de la misma área, IDENTIDAD: quién es por dentro y cómo se vive a sí mismo o a sí misma. 
LO QUE ESCRIBES de cada uno: el título, la descripción y la causa. Y su número, el mismo que te dan, sin cambiarlo.
TODO SALE DE ESA POSICIÓN. Es lo único que dice lo que a esta persona le pasa de verdad: el cuerpo, su signo, su casa y sus aspectos. De ahí sale la descripción y de ahí sale la causa. Si algo no se puede sacar de esa posición, no se escribe.
Y LA CONDUCTA MANDA. Esa posición se podría contar de muchas maneras. La conducta dice cuál de todas es la de esta persona: escribes esa, no otra.
EL SIGNO Y LA CASA TIENEN QUE NOTARSE. El cuerpo dice QUÉ le pasa, el signo DE QUÉ MANERA le pasa y la casa EN QUÉ PARTE DE SU VIDA le pasa. Si lo que escribes valdría igual cambiándole el signo o la casa, es que no lo has escrito de ESTA carta y hay que escribirlo otra vez.
LA POSICIÓN ES PARA TI, NO PARA QUIEN LEE. No la nombres, ni nada técnico ni de astrología. Se cuenta en situaciones reales de su vida.
LAS CASILLAS DE CADA RASGO
titulo Se le habla de tu, igual que en todo lo demás: es lo que hace
 o lo que le pasa, dicho a la persona. No el nombre de eso.
 Un título que arranca con un sustantivo y le cuelga adjetivos
 detrás no le habla a nadie, es una etiqueta de manual, y está mal
 aunque describa bien el rasgo.
 De cuatro a siete palabras, con sus artículos y sus preposiciones,
 como se habla. Empieza en mayúscula, y sin punto al final.
descripcion TRES RENGLONES, ni dos ni cuatro. Son unos doscientos sesenta
 caracteres contando los espacios. No se cuentan frases: dos frases
 pueden ocupar cinco renglones.
Cuenta tres cosas: qué hace, qué le pasa y cómo se le nota.

 TRES ES LA MEDIDA, NO EL TECHO. Con dos se queda a medias: se
 enuncia el rasgo y no da tiempo a que se entienda, y quien lo lee
 pasa al siguiente sin haberse reconocido en ninguno.
causa Por que le pasa ESE rasgo en concreto y de donde le viene, que es
 lo que quiere saber. Dos o tres frases.
 ABRE NOMBRANDO LA CAUSA, no describiendo otra vez lo que le
 pasa. La primera frase ya dice qué hay debajo que lo produce.
 NO REPITE EL RASGO CON OTRAS PALABRAS. Lo que hace y cómo se le
 nota ya está arriba, en la descripcion. Aquí se dice qué hay
 DETRÁS que lo produce, el mecanismo del que sale.
NI DOS TÍTULOS NI DOS DESCRIPCIONES QUE EMPIECEN IGUAL NI TERMINEN IGUAL. Antes de entregar, lee en columna los títulos de toda la lista, y luego las descripciones: los que arranquen o rematen igual que otro se escriben otra vez de otra manera. 
Devuelve solo la lista, con todos los rasgos que te han dado y ninguno más.`;

// Un rasgo mal escrito no cuenta como escrito.
const vieneMal = e =>
  ['titulo', 'descripcion', 'causa'].some(c => esRelleno(e?.[c])) ||
  ['descripcion', 'causa'].some(c => acabaColgado(e?.[c]));

// LOS QUE DE VERDAD VUELVEN ESCRITOS. Un numero que no es de la lista no
// cuenta, y uno mal escrito tampoco: los dos acaban fuera igual.
const losQueValen = (salida, cuantos) => {
  const vistos = new Set();
  for (const e of (Array.isArray(salida?.rasgos) ? salida.rasgos : [])) {
    const n = Number(e?.n);
    if (!Number.isInteger(n) || n < 1 || n > cuantos) continue;
    if (vieneMal(e)) continue;
    vistos.add(n);
  }
  return vistos.size;
};

async function pedirLoEscrito(rasgos, nombrePila, sexo, reloj, esfuerzo = 'low') {
  const arranque = Date.now();
  const salida = await alModelo({
    que: 'escribir los rasgos',
    modelo: 'claude-sonnet-5',
    razona: esfuerzo,
    techo: 8000,
    // EL TONO VA DELANTE, igual que en el P1: primero como se escribe, y
    // detras el encargo.
    // LOS RASGOS VAN DENTRO DEL ENCARGO, igual que en el P1, y el mensaje es
    // una frase fija.
    system: `${TONO}\n\n\n${ENCARGO_DE_ESCRIBIR}\nLOS RASGOS: \n${losRasgosSinEscribir(rasgos)}\nPersona: ${comoSeLeHabla(sexo)}\nNombre de pila: ${nombrePila}`,
    mensaje: 'Escribe estos rasgos, siguiendo el esquema.',
    molde: ESQUEMA_DE_ESCRIBIR,
    espera: reloj.senal(TOPE_DE_ESCRIBIR),
  });
  reloj.apunta('escribir los rasgos', arranque);
  return salida;
}

// FALLA TAMBIEN SI NO VUELVEN TODOS. Si se piden cinco tienen que volver cinco
// escritos, y si no, se vuelve a pedir.
async function escribirLosRasgos(todos, nombrePila, sexo, reloj) {
  if (todos.length === 0) return todos;

  let salida;
  try {
    salida = await pedirLoEscrito(todos, nombrePila, sexo, reloj);
  } catch (err) {
    if (err.temporal === false || !reloj.hayTiempoPara(100)) throw err;
    console.warn(`los rasgos no se han escrito (${err.message.slice(0, 80)}), se repite`);
    salida = await pedirLoEscrito(todos, nombrePila, sexo, reloj);
  }

  let valen = losQueValen(salida, todos.length);
  for (let intento = 2; valen < todos.length && intento <= INTENTOS_DE_ESCRIBIR; intento++) {
    if (!reloj.hayTiempoPara(100)) break;
    console.warn(`se pidieron ${todos.length} rasgos y han vuelto escritos ${valen}, se repite`);
    let otra;
    try {
      otra = await pedirLoEscrito(todos, nombrePila, sexo, reloj);
    } catch (err) {
      // Si una tirada se cae, vale la mejor que haya salido hasta ahora.
      console.warn(`esa tirada tampoco ha salido (${err.message.slice(0, 80)}), se sigue con la mejor`);
      break;
    }
    // SE QUEDA LA MEJOR DE LAS DOS, nunca la ultima por ser la ultima.
    const valenOtra = losQueValen(otra, todos.length);
    if (valenOtra > valen) { salida = otra; valen = valenOtra; }
  }

  // Se pega lo escrito a cada rasgo por su numero. El que no vuelva, o vuelva
  // mal, se queda sin escribir y se cae mas abajo.
  const escritos = [];
  for (const e of (Array.isArray(salida?.rasgos) ? salida.rasgos : [])) {
    const n = Number(e?.n);
    if (!Number.isInteger(n) || n < 1 || n > todos.length) continue;
    if (vieneMal(e)) continue;
    escritos.push({
      ...todos[n - 1],
      nombre: String(e.titulo).trim(),
      descripcion: String(e.descripcion).trim(),
      causa: String(e.causa).trim(),
    });
  }
  return escritos;
}


// ═══════════════════════════════════════════════════════════════
// SIN LLAMAR A NADIE, Y GRATIS: LAS REDES DE DESPUES DE ESCRIBIR
//
// Fuera el que le nombra la astrologia a la clienta · el techo · el aviso si
// se queda corta.
// ═══════════════════════════════════════════════════════════════

function pasarLasRedes(escritos, reloj) {
  // 1. Fuera el que le nombra la carta a la clienta. Esto no es criterio: son
  //    palabras que se buscan y se ven.
  const limpios = escritos.filter(r => !hablaDeAstrologia(r));
  if (limpios.length < escritos.length) {
    console.warn(`${escritos.length - limpios.length} rasgos nombraban la carta a la clienta, se quitan`);
  }

  // 2. El techo. Si sobran, se quedan los primeros, que es el orden en que el
  //    encargo le pide escribirlos: primero los que mas pesan.
  const salen = [];
  for (const cual of ['fortalezas', 'desafios']) {
    const suyos = limpios.filter(r => r.lista === cual);
    if (suyos.length > POR_AREA[cual].max) {
      console.warn(`${cual}: ${suyos.length}, se dejan ${POR_AREA[cual].max}`);
    }
    salen.push(...suyos.slice(0, POR_AREA[cual].max));
  }

  // 3. Y si aun asi se ha quedado corta, se deja aviso.
  for (const cual of ['fortalezas', 'desafios']) {
    const hay = salen.filter(r => r.lista === cual).length;
    if (hay < POR_AREA[cual].min) console.warn(`${cual}: por debajo del minimo (${hay} de ${POR_AREA[cual].min})`);
  }

  reloj.cuaderno.escritos = salen.map(r => ({
    lista: r.lista, area: r.area, conducta: r.conducta,
    titulo: r.nombre, descripcion: r.descripcion,
  }));

  return {
    fortalezas: salen.filter(r => r.lista === 'fortalezas'),
    desafios:   salen.filter(r => r.lista === 'desafios'),
  };
}

// ═══════════════════════════════════════════════════════════════
// 4a LLAMADA — EL AREA 1 · Sonnet, SIN PENSAR
//
// Recibe: solo esos rasgos ya escritos. Los desafios con su porque, las
//         fortalezas sin el. NO VE LA CARTA.
// Entrega: el texto del area.
//
// EL RAZONAMIENTO, APAGADO. Este modelo razona antes de escribir si no se le
// dice lo contrario, y ese razonamiento sale del mismo presupuesto y se paga
// igual que el texto. Encendido, cada area tardaba 45 segundos, se gastaba los
// tokens en pensar y devolvia el texto vacio.
//
// POR SI ACASO, HASTA 2 LLAMADAS MAS: se reintenta si falla por algo pasajero,
// y si acaba a media frase tambien. A la tercera se entrega igual: quedarse sin
// texto es peor que una frase sin punto. El relleno no se entrega nunca.
// ═══════════════════════════════════════════════════════════════

const INTENTOS_POR_AREA = 3;
const TOPE_DEL_AREA = 90000;

// EL PROMPT DEL AREA. Es el del area 1 del P1, copiado entero, con seis
// cosas cambiadas: aqui el area acaba en el [C] -el porque-, no en el [E].
// Lo demas esta igual, palabra por palabra: las cuatro cosas que cubre el
// [A], la escena con sus marcas, y las siete cosas sin las que el area no
// esta terminada.
const PROMPT_DEL_AREA = `Genera ÚNICAMENTE el ÁREA 1 — IDENTIDAD para esta persona: quién es por dentro y cómo se vive a sí mismo o a sí misma.

Esta área abre el estudio, así que empieza con una entrada de dos o tres frases que le sitúen antes de entrar en materia, como se abre un libro. Suave, sin prisa y sin adelantar lo que viene.

EN ESTA ÁREA, EL BLOQUE [A] CUBRE cuatro cosas, cada una sacada de sus rasgos y ninguna afirmada de pasada:

Cómo funciona por dentro: el mecanismo con el que procesa lo que le pasa, qué le ocurre primero y qué después, y qué consecuencia tiene ese orden en lo que hace por fuera. Es lo que le pone nombre a su manera de funcionar y lo que se lleva puesto al terminar de leer.

Lo que se le da bien de verdad: sus fortalezas reales, sobre todo las que no pondría primero si le preguntaras. Sin esto el área se convierte en un repaso de defectos y la persona cierra el informe tocada.

Los puntos ciegos que no ve: lo que hace y no registra como un problema, o que registra al revés, como si fuera una virtud. Es lo único del área que le cuenta algo que no sabía, así que aquí no te quedes en lo cómodo.

Qué muestra, qué oculta y qué contradicciones tiene: la distancia entre la persona que enseña y la que guarda, y las cosas suyas que no encajan entre sí y conviven igual. Es lo que hace que el texto suene a esa persona y no a un perfil que le valdría a cualquiera.

Esas cuatro cosas no se solapan entre ellas y ninguna vuelve a aparecer más adelante.

LA SECUENCIA DE ESTA ÁREA, EN ESTE ORDEN EXACTO: [A], [B], [C]

CÓMO ENTRA CADA BLOQUE EN ESTA ÁREA: la [B] entra sin avisar, pegada a la frase anterior y arrancando por el momento concreto. El [C] entra contestando algo que ya se ha preguntado alguna vez.
No pongas título ni encabezado. Solo el texto del área. Entre 650 y 700 palabras, en párrafos de longitud variada, entre 2 y 7 líneas, ninguno de más de 90 palabras.

EL ÁREA NO ESTÁ TERMINADA SI LE FALTA UNA SOLA DE ESTAS OCHO COSAS. Son obligatorias, no van a tu criterio, y son lo último que tienes que tener delante mientras escribes:

1. TODOS los puntos que le tocan a ESTA área, contados uno a uno y desarrollados. Si le tocan cuatro, están los cuatro; si le tocan tres, los tres. Ninguno resuelto de pasada dentro de otro ni dado por dicho.

2. LA [B], con "> " delante de CADA UNO de sus párrafos: el signo mayor, un espacio, y ya la primera palabra del párrafo. Sin esa marca el área está sin terminar. Ningún otro párrafo del área lleva esa marca.

3. LOS SUBTÍTULOS, con "## " delante, uno cada vez que dejas un asunto y empiezas otro. En un área de este largo eso son DOS. Ninguno abre el área.

4. UNA o DOS fortalezas y DOS o TRES desafíos, ni más ni menos.

5. Su nombre de pila, dos veces como mínimo y separadas.

6. Los tres bloques en la secuencia exacta de ESTA área, ningún párrafo por encima de 90 palabras, y ninguna fortaleza con un porqué inventado.

7. LA ÚLTIMA COSA DEL ÁREA ES UNA PREGUNTA, sola en su párrafo y sin nada detrás. Sale de lo último que le has contado.

8. TODO EL ÁREA ESCRITA DE TÚ, de la primera palabra a la última. En ningún momento hablas de quien lee en tercera persona ni le nombras como sujeto de una frase. Su nombre, si lo usas, es solo para llamarle directamente, nunca seguido de un verbo que hable de lo que hace o siente.
`;

// LAS FORTALEZAS VAN SIN SU PORQUE Y LOS DESAFIOS CON EL, igual que en el P1.
function losRasgosDelArea(rasgos) {
  const linea = (r, conCausa) => `- ${r.nombre}: ${r.descripcion}${conCausa && r.causa ? ` POR QUE LE PASA: ${r.causa}` : ''}`;
  const f = (rasgos.fortalezas || []).map(r => linea(r, false));
  const d = (rasgos.desafios   || []).map(r => linea(r, true));
  if (f.length === 0 && d.length === 0) return '';
  return `\n\nRASGOS QUE SE LE HAN SACADO PARA ESTA AREA:\n\nFORTALEZAS\n${f.join('\n') || '(ninguna)'}\n\nDESAFIOS\n${d.join('\n') || '(ninguno)'}`;
}

async function pedirElArea(contextoPersona, rasgos, reloj) {
  const arranque = Date.now();
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    signal: reloj.senal(TOPE_DEL_AREA),
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-5',
      thinking: { type: 'disabled' },
      max_tokens: 3500,
      // EL TONO VA DELANTE, IGUAL QUE EN EL P1. Es el mismo bloque y el mismo
      // sitio: primero como se escribe, y detras el encargo del area.
      system: `${TONO}\n\n\n${SYSTEM_PROMPT}`,
      messages: [{ role: 'user', content: `${contextoPersona}\n\n${PROMPT_DEL_AREA}${losRasgosDelArea(rasgos)}` }],
    }),
  });

  if (!response.ok) {
    const detalle = await response.text();
    const err = new Error(`el area: ${response.status} — ${detalle.slice(0, 300)}`);
    err.temporal = response.status === 429 || response.status >= 500;
    throw err;
  }

  const data = await response.json();
  const texto = data.content?.[0]?.text || '';

  if (!texto || texto.trim().length < 100) {
    const err = new Error('el area ha devuelto texto vacio o demasiado corto');
    err.temporal = true;
    throw err;
  }

  // NI RELLENO NI FRASE CORTADA. Pero se entrega igual si lo unico que le pasa
  // es que acaba sin punto: quedarse sin texto es peor. El relleno no se
  // entrega nunca.
  if (esRelleno(texto) || acabaColgado(texto)) {
    const err = new Error(`el area ${esRelleno(texto) ? 'trae texto de relleno' : 'se corta a media frase'}`);
    err.temporal = true;
    if (!esRelleno(texto)) err.seEntregaIgual = texto.trim();
    throw err;
  }

  reloj.apunta('el area', arranque);
  return texto.trim();
}

async function generarElArea(contextoPersona, rasgos, reloj) {
  const arranque = Date.now();
  let ultimoError;
  for (let intento = 1; intento <= INTENTOS_POR_AREA; intento++) {
    try {
      return await pedirElArea(contextoPersona, rasgos, reloj);
    } catch (err) {
      ultimoError = err;
      // Un corte de red llega sin marca; se trata como temporal.
      const temporal = err.temporal !== false;
      // Y en el ultimo intento, si lo unico que le pasa es que acaba sin punto,
      // vale ese texto: es preferible a dejarla sin nada.
      if (intento === INTENTOS_POR_AREA && err.seEntregaIgual) {
        console.warn('el area sigue acabando a media frase, se entrega igual');
        reloj.apunta('el area', arranque);
        return err.seEntregaIgual;
      }
      if (!temporal || intento === INTENTOS_POR_AREA) break;
      console.warn(`el area: intento ${intento} fallido (${err.message.slice(0, 80)}), reintentando`);
      await new Promise(r => setTimeout(r, 1500 * intento));
    }
  }
  throw ultimoError;
}


// ═══════════════════════════════════════════════════════════════
// LAS CUATRO, ENCADENADAS
//
// 1a sacar  ->  2a limpiar  ->  3a escribir  ->  4a el area
//
// SIN RED EN LAS DOS PRIMERAS: si no salen los rasgos, no hay texto. Se corta
// aqui en vez de entregar algo a medias.
// ═══════════════════════════════════════════════════════════════

export async function escribirElRegalo({ nombre, sexo, fechaNice, hora, lugar, edad, cartaTexto, casasTexto }, reloj = crearReloj()) {
  // El cliente escribe nombre y apellidos en la misma casilla, asi que aqui se
  // separa la primera palabra: al modelo se le habla de ella por su nombre de
  // pila, nunca por el apellido ni por el nombre entero.
  const nombrePila = String(nombre).trim().split(/\s+/)[0] || String(nombre).trim();

  const contextoPersona = [
    `Nombre de pila: ${nombrePila}`,
    `Persona: ${comoSeLeHabla(sexo)}`,
    `Nacio el ${fechaNice} a las ${hora} en ${lugar}`,
    `Edad: ${edad} anos`,
  ].join('\n');

  // 1a — sacar los rasgos, con sus dos llamadas de repuesto.
  //
  // LO QUE HAY EN CADA CASA VA SOLO AQUI, igual que en el P1. Sin esto el
  // modelo no sabe que hay dentro de la casa 1 y se lo inventa. El area, mas
  // abajo, no recibe nada de la carta: escribe con los rasgos que salen de
  // aqui.
  const cartaConLasCasas = casasTexto ? `${cartaTexto}\n\n${casasTexto}` : cartaTexto;
  const todos = await unaListaDeRasgos(nombrePila, sexo, cartaConLasCasas, reloj);
  reloj.cuaderno.entraron = todos.map((r, i) => ({
    n: i + 1, lista: r.lista, area: r.area, conducta: r.conducta, origen: r.origen,
  }));
  if (todos.length === 0) throw new Error('no ha salido ni un rasgo');

  // 2a — la limpieza, y el suelo detras sin llamar a nadie.
  const quedan = await limpiarYSuelo(todos, reloj);

  // 3a — escribirlos, con sus dos llamadas de repuesto.
  const escritos = await escribirLosRasgos(quedan, nombrePila, sexo, reloj);
  if (escritos.length === 0) throw new Error('no se ha escrito ni un rasgo');

  // Las redes de codigo, gratis.
  const rasgos = pasarLasRedes(escritos, reloj);

  // Y SI LAS REDES SE LO LLEVAN TODO, SE CORTA AQUI. El area escribe con los
  // rasgos y con nada mas: sin ninguno saldria un texto que no habla de esta
  // persona ni de ninguna. Es la misma regla que con el relleno: mas vale no
  // dar nada que dar algo que no es suyo.
  if (rasgos.fortalezas.length + rasgos.desafios.length === 0) {
    throw new Error('las redes han dejado el area sin ningun rasgo');
  }

  // 4a — el area, con sus dos llamadas de repuesto.
  const texto = await generarElArea(contextoPersona, rasgos, reloj);

  return { texto, rasgos, cuaderno: reloj.cuaderno };
}
