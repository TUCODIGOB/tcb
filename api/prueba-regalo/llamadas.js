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

// Los mismos topes por area que el P1: esto es lo que se ENTREGA al final.
const POR_AREA = {
  fortalezas: { min: 1, max: 2 },
  desafios:   { min: 2, max: 3 },
};

// LO QUE SACA LA 1a: UN TOPE, NO UN CUPO.
//
// Se le pide MAS de lo que se entrega, para que tenga que dejar a alguien
// fuera: quien no descarta no compara, y quien no compara no ordena por peso
// aunque se lo pidas.
//
// Pero se le pide como tope, no como cantidad obligatoria. Con ocho se salio
// del area: IDENTIDAD es el Sol, el Ascendente, lo que caiga en la casa 1 y
// los aspectos de los tres, y de ahi no salen ocho rasgos de verdad en
// cualquier carta. Cuando el cupo y el area se peleaban, obedecia al cupo y se
// iba a buscar a otras casas. Con seis de tope y permiso para devolver menos,
// no tiene que ir a ningun sitio a rellenar.
const CANDIDATOS = { fortalezas: 2, desafios: 4 };

const CUANTOS_RASGOS = CANDIDATOS.fortalezas + CANDIDATOS.desafios;   // 6

// Y por debajo de esto no hay ni para llenar lo que se entrega, asi que se
// vuelve a pedir la lista.
const MINIMO_DE_CANDIDATOS = POR_AREA.fortalezas.max + POR_AREA.desafios.max;   // 5

// ═══════════════════════════════════════════════════════════════
// LO QUE CUESTA CADA MODELO, EN DOLARES POR MILLON DE TOKENS.
//
// Son los precios de Anthropic. Si los cambian, se cambian aqui y ya esta.
// Lo que el modelo piensa se cobra como salida y viene ya sumado dentro de
// output_tokens, asi que no hay que contarlo aparte.
// ═══════════════════════════════════════════════════════════════

const PRECIOS = {
  'claude-opus-5':   { entrada: 5, salida: 25 },
  'claude-sonnet-5': { entrada: 2, salida: 10 },
};

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
  const cuaderno = { tiempos: [], gastos: [], entraron: [], quitaLimpieza: [], devueltos: [], escritos: [] };
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
    // LO QUE HA COSTADO UNA LLAMADA. Igual que los tiempos: solo sirve para
    // poder mirar despues cual se lleva el dinero. No decide NADA. Si el
    // modelo no estuviera en la tabla de precios, se apuntan los tokens y el
    // gasto se queda en cero, pero no se rompe nada.
    gasta: (que, modelo, uso) => {
      if (!uso) return;
      const entrada = (uso.input_tokens || 0)
        + (uso.cache_read_input_tokens || 0)
        + (uso.cache_creation_input_tokens || 0);
      const salida = uso.output_tokens || 0;
      const precio = PRECIOS[modelo];
      const dolares = precio
        ? (entrada * precio.entrada + salida * precio.salida) / 1000000
        : 0;
      cuaderno.gastos.push({ que, modelo, entrada, salida, dolares });
      console.log(`[regalo] ${que}: ${entrada} de entrada + ${salida} de salida = ${dolares.toFixed(4)} $`);
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

async function alModelo({ que, modelo, razona, techo, system, mensaje, molde, espera, reloj }) {
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

  // EL GASTO SE APUNTA AQUI, antes de mirar si lo que vino sirve: los tokens
  // ya se han pagado aunque la respuesta haya que tirarla.
  if (reloj) reloj.gasta(que, modelo, data.usage);

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
// 1a LLAMADA — PROPONER LOS CANDIDATOS · Opus, pensando medio
//
// AQUI YA NO SE ELIGE, SOLO SE PROPONE. Antes esta llamada sacaba de la carta
// y decidia los cinco definitivos a la vez, y por eso salian flojos: hacia dos
// trabajos de golpe. Ahora propone ocho y elige la siguiente, que ya lee una
// lista escrita en cristiano en vez de posiciones en tecnico.
//
// Recibe: la carta natal entera, con las casas.
// Entrega: 8 candidatos (3 fortalezas y 5 desafios). De cada uno: si es
//          fortaleza o desafio, la conducta, que le cuesta o que le da, el
//          area y de que posicion de la carta sale.
//
// POR SI ACASO, HASTA 2 LLAMADAS MAS:
//   - si falla, se repite pensando menos;
//   - si vuelven menos de 8, se pide la lista ENTERA otra vez y se queda la
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
          // QUE LE CUESTA O QUE LE DA. Tampoco lo lee la clienta: es con lo
          // que la llamada siguiente compara unos rasgos con otros. Sin esto
          // elegir "los de mas peso" es una corazonada; con esto hay algo
          // escrito delante que comparar.
          precio:   { type: 'string' },
          area:     { type: 'string', enum: [EL_AREA] },
          origen:   { type: 'string' },
        },
        required: ['lista', 'conducta', 'precio', 'area', 'origen'],
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
Sacas HASTA 2 fortalezas y HASTA 4 desafíos. Todos de IDENTIDAD: quién es por dentro y cómo se vive a sí mismo o a sí misma.
ES UN TOPE, NO UNA CANTIDAD QUE HAYA QUE LLENAR. Si de IDENTIDAD no salen tantos de verdad, devuelves menos y ya está: mejor tres buenos que seis rellenando. Lo que no vale, en ningún caso, es salirte del área para llegar al número. Un rasgo que habla de otra cosa no cuenta como rasgo de esta área, por bueno que sea.
SON CANDIDATOS, NO LA LISTA FINAL. Después otra lectura se queda con los que más pesen y descarta el resto, así que aquí no te guardes ninguno: pon los que encuentres de verdad, cada uno con su precio, y que decida el de después.


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

precio      Qué le cuesta o qué le da ese rasgo, en concreto y en una frase
corta. Se paga en algo que se pueda nombrar: su tiempo, su
dinero, su salud, la gente que tiene cerca, o su calma. Si es
una fortaleza, lo que le da; si es un desafío, lo que le quita.
NO ES PARA QUIEN LEE, es para que la lectura de después sepa
cuál pesa más que cuál. Por eso se dice en seco y sin adornos.
Y SI NO PUEDES NOMBRAR EL PRECIO, ESE RASGO NO ENTRA. Un rasgo
del que no sabes decir qué le cuesta o qué le da es un rasgo que
no le está pasando de verdad. Lo dejas fuera y NO RELLENAS SU
SITIO: se queda vacío y devuelves uno menos. Un hueco vacío no
hace daño; uno relleno con un rasgo flojo se lo lleva puesto un
sitio de los que se entregan.

area         siempre IDENTIDAD, escrita así, en mayúsculas.

origen       De donde sale el rasgo en la carta, en técnico y en corto: el
             cuerpo con su signo y su casa, o los dos cuerpos con su signo y su
             casa cada uno y el aspecto que forman. Nada más: ni explicación ni
             frase.
             Es obligatoria. Y no saques todos los rasgos de la misma
             posición: entre el Sol, el Ascendente, lo que haya en la casa 1
             y los aspectos de los tres, hay de sobra.
             Y DE AHÍ NO SE SALE. Esas son las posiciones de esta área y no
             hay más: si se te acaban, es que esta carta da los rasgos que
             da, y devuelves los que hayas encontrado. Ir a buscar a otra
             casa para llenar la lista es traer rasgos que no son de aquí.

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
ESTE ESTUDIO TIENE SIETE ÁREAS Y TÚ SOLO SACAS LA PRIMERA. Las otras seis son PATRONES -lo que repite sin darse cuenta-, MIEDOS, HERIDA, AMOR, RELACIONES y DINERO, y cada una la saca otra lectura aparte. Un rasgo que sea de una de esas seis NO ENTRA AQUÍ, por bueno que sea y aunque te deje la lista corta: no lo estás quitando, lo estás dejando para quien le toca.

La posición sirvió para encontrarlo; a partir de aquí no decide nada, porque quien lo lee no la ve: solo ve el texto.

Esto se hace rasgo por rasgo y sin saltarse ninguno: es el paso que más veces sale mal.

DESPUÉS, LA CUENTA. Cuentas cuántas fortalezas y cuántos desafíos has sacado. Si te falta alguna, vuelves al Sol, al Ascendente y a la casa 1 a ver si queda alguna sin sacar. Y si de ahí no sale ninguna más, entregas las que tengas: el tope no obliga a llenarlo. No vale escribir una variante de una que ya tienes, ni traerte una de otra parte de la carta para cuadrar el número. 

DESPUÉS, EL TECHO. Si te pasas de dos fortalezas o de cuatro desafíos, se quedan los que más pesan y los demás se van.

Y POR ÚLTIMO, DOS COSAS QUE SE MIRAN EN UN MINUTO: que ninguna conducta ni ningún precio nombren la carta ni nada técnico ni de astrología, y que a ningún rasgo le falte una casilla.
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
    // EL MISMO TECHO QUE EL P1. No es lo que escribe -que son ocho rasgos
    // cortos-: es que pensar sale tambien de aqui, y apretarlo le corta el
    // pensamiento a la mitad.
    techo: 32000,
    system: encargoDeElegir(nombrePila, sexo, cartaTexto),
    mensaje: 'Elige los rasgos de esta carta, siguiendo el esquema.',
    reloj,
    molde: ESQUEMA_DE_ELEGIR,
    espera: reloj.senal(TOPE_DE_ELEGIR),
  });
  reloj.apunta(`sacar los rasgos (${esfuerzo})`, arranque);

  // SIN PRECIO NO ES UN CANDIDATO. Es la casilla con la que se eligen despues
  // los cinco, asi que un rasgo sin ella no se puede comparar con nadie.
  const rasgos = (Array.isArray(salida?.rasgos) ? salida.rasgos : [])
    .filter(r => r && r.lista && r.conducta && r.precio && r.area && r.origen);
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
  // Y SE PIDE OTRA VEZ SOLO SI NO HAY NI PARA ELEGIR. Se le piden ocho, pero
  // con seis o siete todavia hay de sobra para quedarse con cinco: repetir
  // toda la llamada -que es la mas cara de las cuatro- por un candidato de
  // menos seria tirar el dinero. Se repite solo cuando no llegan ni a los
  // cinco que hay que entregar.
  if (rasgos.length < MINIMO_DE_CANDIDATOS && reloj.hayTiempoPara(180)) {
    console.warn(`la 1a llamada ha devuelto ${rasgos.length} candidatos de ${CUANTOS_RASGOS}, se pide otra vez`);
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
// 2a LLAMADA — PONERLES NOTA · Opus, pensando medio
//
// AQUI NO ELIGE EL MODELO: PUNTUA. Y despues ordena el codigo.
//
// Elegir cinco de un vistazo es una decision de golpe, y por eso bailaba de una
// tirada a otra: la misma carta daba cinco rasgos distintos cada vez, todos
// defendibles. Puntuar es otra cosa. Se mira un candidato, se le pone nota en
// cuatro cosas con nombre, se pasa al siguiente, y al final hay ocho columnas
// de numeros que se comparan solas. Eso es mucho mas estable que el vistazo, y
// es como se hace donde esto funciona: criterios con nombre, nota por criterio,
// y la suma la hace el codigo.
//
// Y ASI NO PUEDE CONTRADECIRSE. Antes podia decir que buscaba peso y quedarse
// con otra cosa. Ahora la nota que pone manda: si puntua alto un rasgo, ese
// entra, porque quien ordena no es el.
//
// Recibe: los 8. Numero, tipo, conducta y precio. NO VE LA CARTA.
// Entrega: la nota de los 8 en cuatro criterios, y con cual repite cada uno.
//
// AQUI NO SE ESCRIBE NI UNA PALABRA. El texto lo tiene guardado el codigo del
// paso anterior y lo recupera por el numero, asi que de aqui no puede salir un
// rasgo cambiado.
//
// POR SI ACASO, NINGUNA LLAMADA MAS: si se cae, elige el codigo -los primeros
// de cada lista-. Peor elegidos, pero la clienta tiene su texto.
// ═══════════════════════════════════════════════════════════════

const TOPE_DE_ELEGIR_CINCO = 90000;

// LOS CUATRO CRITERIOS, Y SE SUMAN IGUAL. Ninguno vale mas que otro: un rasgo
// que le cuesta mucho pero casi nunca no pesa mas que uno mediano que le pasa
// todas las semanas y en media vida.
const CRITERIOS = ['cuanto', 'cuando', 'donde', 'duele'];

const ESQUEMA_DE_ELEGIR_CINCO = {
  type: 'object',
  properties: {
    notas: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          n:      { type: 'integer' },
          cuanto: { type: 'integer' },
          cuando: { type: 'integer' },
          donde:  { type: 'integer' },
          duele:  { type: 'integer' },
          // CON CUAL REPITE, O 0. La nota sola no quita los repetidos: dos
          // rasgos que cuentan lo mismo pueden puntuar alto los dos y comerse
          // dos de los cinco sitios. Esto lo dice y el codigo tira al de nota
          // mas baja de la pareja.
          repite: { type: 'integer' },
        },
        required: ['n', 'cuanto', 'cuando', 'donde', 'duele', 'repite'],
        additionalProperties: false,
      },
    },
  },
  required: ['notas'],
  additionalProperties: false,
};

// LO QUE SE LE ENSENA PARA ELEGIR, Y NADA MAS: el numero, si es fortaleza o
// desafio, la conducta y el precio. La posicion de la carta no va, que para
// elegir no pinta nada y solo le quita sitio a lo que si tiene que leer.
function laListaNumerada(rasgos) {
  return rasgos
    .map((r, i) => {
      const tipo = r.lista === 'fortalezas' ? 'FORTALEZA' : 'DESAFÍO';
      const que  = r.lista === 'fortalezas' ? 'LE DA' : 'LE CUESTA';
      return `${i + 1}. ${tipo} — ${r.conducta} — ${que}: ${r.precio}`;
    })
    .join('\n');
}

// EL ENCARGO. Es una rubrica: criterios con nombre, una nota por criterio y por
// candidato, y la suma la hace el codigo. No se le pide que elija, se le pide
// que mida.
const ENCARGO_DE_ELEGIR_CINCO = `Abajo tienes ocho rasgos interiores de una persona, enumerados. De cada uno sabes tres cosas: si es una fortaleza o un desafío, qué hace esa persona, y qué le cuesta o qué le da. Todos son del área IDENTIDAD: quién es por dentro y cómo se vive a sí mismo o a sí misma.

TU TRABAJO ES PONERLES NOTA, NO ELEGIR
No decides cuáles se quedan. Puntúas los ocho y ya está: quién se queda lo decide después una suma, no tú. Así que no vayas guardando sitio ni pensando en cuántos caben, porque no hay cupo que repartir.
Los puntúas TODOS, los ocho, uno por uno y en el orden en que están. Miras uno, le pones sus cuatro notas, y pasas al siguiente. No lo compares con los otros mientras lo puntúas: cada uno se mide contra lo que dice de esa persona, no contra sus vecinos.
Y no escribes nada, ni cambias ninguno, ni añades ninguno que no esté en la lista.

LOS CUATRO CRITERIOS, DEL 1 AL 5
Del 1 al 5 en los cuatro, siempre número entero. 1 es lo más bajo y 5 lo más alto. Usa el 1 y usa el 5 cuando toque: si todo lo puntúas con un 3 o un 4, la nota no distingue nada y no sirve.

"cuanto" — CUÁNTO LE CUESTA O CUÁNTO LE DA. Mira el precio que lleva escrito ese rasgo. 5 es que nombra algo que se puede contar y que es mucho: horas de su vida, dinero, salud, la gente que tiene cerca, su calma. 3 es que nombra algo que se puede contar pero es poco. 1 es que no nombra nada que se pueda contar, o lo dice en vago.

"cuando" — CADA CUÁNTO LE PASA. 5 es casi todos los días, sin que haga falta que ocurra nada especial. 3 es algunas veces al mes, o cuando se dan ciertas situaciones. 1 es muy de tarde en tarde, o solo cuando se juntan cosas raras.

"donde" — EN CUÁNTAS PARTES DE SU VIDA SE LE NOTA. 5 es en casi todo lo que hace, con quien sea y donde sea. 3 es en dos o tres partes suyas, y en el resto no. 1 es en una sola esquina de su vida, y fuera de ahí no aparece.

"duele" — CUÁNTO LE VA A COSTAR RECONOCERLO. 5 es algo que hace y no ha mirado nunca de frente, o que se cuenta al revés y cree que es una virtud. 3 es algo que sospecha de sí pero no ha llamado por su nombre. 1 es algo que ya sabe y que le va a confirmar lo que piensa. Si es una fortaleza, 5 es una fuerza suya que no se reconoce y 1 es la que pondría primero si le preguntaras.

Ninguno de los cuatro vale más que los otros. Se suman igual.

LO QUE NO PUNTÚAS
Que suene bien, que esté mejor escrito, que sea más raro o más bonito. Eso no es una nota, es un gusto. Aquí se mide lo que le está pasando a esa persona, no cómo está contado.
Y NO PUNTÚAS MÁS ALTO LO MÁS LARGO. Que un rasgo traiga el precio escrito con más palabras no lo hace más pesado. Un precio dicho en cuatro palabras y uno dicho en veinte sacan la misma nota si lo que nombran es lo mismo.
Y lo grave no es lo mismo que lo pesado. Algo que suena dramático y le pasa una vez al año saca nota baja en "cuando", por muy fuerte que suene.

"repite" — CON CUÁL DICE LO MISMO
Después de puntuarlos, mira si alguno cuenta la misma conducta que otro con otras palabras. Si es así, pones en "repite" el número del otro. Si no repite con ninguno, pones 0.
Repetir es contar la misma conducta. Que dos hablen del mismo tema, o que vayan juntos, o que uno sea la consecuencia del otro, no es repetir: ahí va 0.

LO QUE DEVUELVES
"notas": una entrada por cada uno de los ocho, con su número, sus cuatro notas y su "repite". Los ocho, ninguno suelto y ninguno repetido.`;

async function pedirLosCinco(rasgos, reloj) {
  const arranque = Date.now();
  const salida = await alModelo({
    que: 'elegir los cinco',
    modelo: 'claude-opus-5',
    // AQUI SI PIENSA. Poner nota a ocho cosas en cuatro criterios es trabajo, y
    // sin pensar sale todo con un 3. Medio y no alto: se puntua sobre una lista
    // corta y ya escrita, no sobre una carta en tecnico.
    razona: 'medium',
    // El techo es holgado y no por lo que escribe -que son unos pocos numeros-,
    // sino porque pensar tambien gasta de aqui.
    techo: 16000,
    // LA LISTA VA DENTRO DEL ENCARGO, igual que en el P1, y el mensaje es una
    // frase fija.
    system: `${ENCARGO_DE_ELEGIR_CINCO}\n\n\nLA LISTA:\n\n${laListaNumerada(rasgos)}`,
    mensaje: 'Ponles nota a los ocho, siguiendo el esquema.',
    reloj,
    molde: ESQUEMA_DE_ELEGIR_CINCO,
    espera: reloj.senal(TOPE_DE_ELEGIR_CINCO),
  });
  // EL NOMBRE DEL APUNTE NO CAMBIA: es el que busca la pagina para enseñar lo
  // que ha tardado esta llamada.
  reloj.apunta('limpiar los rasgos', arranque);
  return salida;
}

// LAS NOTAS, LIMPIAS. Una suma por candidato y con quien repite, o nada si de
// ese no ha dicho nada. Cada nota tiene que ser un entero del 1 al 5: lo que
// venga fuera de ahi no se recorta a la fuerza, se tira la entera, que una nota
// inventada ensucia la suma mas que una que falta.
function lasNotas(salida, todos) {
  const notas = new Map();
  for (const e of (Array.isArray(salida?.notas) ? salida.notas : [])) {
    const n = Number(e?.n);
    if (!Number.isInteger(n) || n < 1 || n > todos.length || notas.has(n)) continue;

    const puntos = CRITERIOS.map(c => Number(e?.[c]));
    if (puntos.some(p => !Number.isInteger(p) || p < 1 || p > 5)) continue;

    // El gemelo tiene que existir, no ser el mismo, y ser de su misma lista:
    // una fortaleza y un desafio no son la misma conducta contada dos veces.
    const otro = Number(e?.repite);
    const repite = Number.isInteger(otro) && otro >= 1 && otro <= todos.length
      && otro !== n && todos[otro - 1].lista === todos[n - 1].lista ? otro : 0;

    notas.set(n, { suma: puntos.reduce((a, b) => a + b, 0), repite });
  }
  return notas;
}

// SIN LLAMAR A NADIE, Y GRATIS: EL CODIGO SUMA Y ORDENA.
//
// El modelo pone las notas; quien decide es esto. Se ordena cada lista por la
// suma, de mas a menos, y se cogen los de arriba. En caso de empate manda el
// orden en que llegaron, que no hay nada mejor con lo que desempatar y asi la
// misma respuesta da siempre lo mismo.
//
// Y salen DOS fortalezas y TRES desafios exactos, pase lo que pase: si de
// alguno no ha dicho nada, va detras de todos los puntuados; si la llamada se
// ha caido y no hay ninguna nota, se cogen los primeros de cada lista.
function losCincoQueQuedan(salida, todos, reloj) {
  const notas = lasNotas(salida, todos);
  const elegidos = [];
  const sinNota = [];

  for (const cual of ['fortalezas', 'desafios']) {
    const suyos = todos
      .map((r, i) => i + 1)
      .filter(n => todos[n - 1].lista === cual)
      .sort((a, b) => (notas.get(b)?.suma ?? 0) - (notas.get(a)?.suma ?? 0) || a - b);

    const cogidos = [];
    for (const n of suyos) {
      if (cogidos.length === POR_AREA[cual].max) break;
      // SI REPITE CON UNO QUE YA ESTA DENTRO, NO ENTRA. Como la lista va por
      // nota, el que ya esta dentro es el de la pareja que mas puntuo.
      const gemelo = notas.get(n)?.repite || 0;
      if (gemelo && cogidos.includes(gemelo)) {
        console.warn(`el ${n} repite con el ${gemelo}, que ya esta dentro: se coge otro`);
        continue;
      }
      if (!notas.has(n)) sinNota.push(n);
      cogidos.push(n);
    }

    if (cogidos.length < POR_AREA[cual].max) {
      console.warn(`${cual}: solo hay ${cogidos.length} candidatos de ${POR_AREA[cual].max}`);
    }
    elegidos.push(...cogidos);
  }

  console.log(`notas: ${todos.map((_, i) => `${i + 1}:${notas.get(i + 1)?.suma ?? '-'}`).join(' ')}`);
  reloj.cuaderno.devueltos = sinNota;
  reloj.cuaderno.quitaLimpieza = todos.map((_, i) => i + 1).filter(n => !elegidos.includes(n));
  return elegidos.map(n => todos[n - 1]);
}

// SI LA ELECCION SE CAE, ELIGE EL CODIGO Y SE SIGUE.
async function elegirLosCinco(todos, reloj) {
  if (todos.length === 0) return [];

  let salida = null;
  try {
    salida = await pedirLosCinco(todos, reloj);
  } catch (err) {
    console.warn(`la eleccion se ha caido (${err.message.slice(0, 80)}), elige el codigo`);
  }

  const cinco = losCincoQueQuedan(salida, todos, reloj);
  console.log(`de ${todos.length} candidatos se quedan ${cinco.length}`);
  return cinco;
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
    reloj,
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

  // Igual que en alModelo: el gasto se apunta antes de mirar el texto.
  reloj.gasta('el area', 'claude-sonnet-5', data.usage);

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
// 1a proponer 8  ->  2a elegir 5  ->  3a escribir  ->  4a el area
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

  // 1a — proponer los ocho candidatos, con sus dos llamadas de repuesto.
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

  // 2a — elegir los cinco de mas peso, con el codigo de arbitro detras.
  const quedan = await elegirLosCinco(todos, reloj);

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
