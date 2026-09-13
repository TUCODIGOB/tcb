// ═══════════════════════════════════════════════════════════════
// api/prueba-regalo/llamadas.js
//
// LAS CUATRO LLAMADAS DEL REGALO, ENCADENADAS Y CON SUS REINTENTOS.
//
// Es la misma maquinaria del P1 -el reloj, los reintentos, las redes y los
// topes-, copiada de api/chat.js. Alli no se toca nada: esto es una copia
// aparte para el trozo gratis.
//
// LOS ENCARGOS NO ESTAN AQUI TODAVIA. Estan vacios a proposito: son el paso
// siguiente. Sin ellos esto no genera nada, pero la maquina ya esta montada.
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

// EL ENCARGO VA EN EL PASO SIGUIENTE. Aqui todavia no hay ninguno.
const ENCARGO_DE_ELEGIR = '';

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
    techo: 16000,
    system: encargoDeElegir(nombrePila, sexo, cartaTexto),
    mensaje: 'Saca los rasgos.',
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
    if (err.temporal === false || !reloj.hayTiempoPara(120)) throw err;
    console.warn(`la tirada con esfuerzo medio fallo (${err.message.slice(0, 80)}), se repite pensando menos`);
    return await pedirLosRasgos(nombrePila, sexo, cartaTexto, reloj, 'low');
  }

  // Y SI VUELVE CORTA, SE PIDE OTRA VEZ ENTERA. No se le puede pedir solo los
  // que faltan: los compara entre ellos mientras los escribe, y sin ver los que
  // ya hay los repetiria. Se queda la mejor de las dos, nunca la ultima por ser
  // la ultima.
  if (rasgos.length < CUANTOS_RASGOS && reloj.hayTiempoPara(120)) {
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
  },
  required: ['sequedan', 'sequitan'],
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

// EL ENCARGO VA EN EL PASO SIGUIENTE. Aqui todavia no hay ninguno.
const ENCARGO_DE_LIMPIAR = '';

async function limpiarLosRasgos(rasgos, reloj) {
  const arranque = Date.now();
  const salida = await alModelo({
    que: 'limpiar los rasgos',
    modelo: 'claude-opus-5',
    // AQUI SI PIENSA, Y ALTO: comparar rasgos entre si es pensar, y con el
    // esfuerzo bajo no se hace.
    razona: 'high',
    // El techo es holgado y no por lo que escribe -que son unos pocos numeros-,
    // sino porque pensar tambien gasta de aqui.
    techo: 16000,
    system: ENCARGO_DE_LIMPIAR,
    mensaje: `LA LISTA:\n\n${laListaNumerada(rasgos)}`,
    molde: ESQUEMA_DE_LIMPIAR,
    espera: reloj.senal(TOPE_DE_LIMPIAR),
  });
  reloj.apunta('limpiar los rasgos', arranque);

  const numeros = v => (Array.isArray(v) ? v : [])
    .map(Number)
    .filter(n => Number.isInteger(n) && n >= 1 && n <= rasgos.length);

  return { sequedan: numeros(salida?.sequedan), sequitan: numeros(salida?.sequitan) };
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

// EL ENCARGO VA EN EL PASO SIGUIENTE. Aqui todavia no hay ninguno.
const ENCARGO_DE_ESCRIBIR = '';

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
    system: `${TONO}\n\n\n${ENCARGO_DE_ESCRIBIR}`,
    mensaje: `LOS RASGOS:\n${losRasgosSinEscribir(rasgos)}\nPersona: ${comoSeLeHabla(sexo)}\nNombre de pila: ${nombrePila}`,
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

// EL PROMPT DEL AREA VA EN EL PASO SIGUIENTE. Aqui todavia no hay ninguno.
const PROMPT_DEL_AREA = '';

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

export async function escribirElRegalo({ nombre, sexo, fechaNice, hora, lugar, edad, cartaTexto }, reloj = crearReloj()) {
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
  const todos = await unaListaDeRasgos(nombrePila, sexo, cartaTexto, reloj);
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

  // 4a — el area, con sus dos llamadas de repuesto.
  const texto = await generarElArea(contextoPersona, rasgos, reloj);

  return { texto, rasgos, cuaderno: reloj.cuaderno };
}
