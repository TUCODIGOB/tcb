// ═════════════════════════════════════════════════════════════════
// test/bloques-obligatorios.test.mjs
//
// LOS BLOQUES DEL AREA SALEN SIEMPRE, TODOS.
//
// El prompt le pide seis bloques en cada area: el arranque, HOY, ORIGEN,
// CREENCIAS, SOLTAR y el CIERRE. En el informe del 23 de agosto faltaba
// ORIGEN —"de donde te viene esto"— en CUATRO de las siete areas, y nadie se
// enteraba: los bloques iban todos revueltos en una sola casilla, "parrafos",
// y ahi dentro no habia forma de contarlos. De ahi salian las dos quejas a la
// vez: que el area se lee corta y que cuenta una sola idea.
//
// Ahora cada bloque tiene su casilla y sus huecos con nombre, y los huecos
// obligatorios van en "required": la API no le deja terminar la respuesta sin
// ellos. Es el mismo mecanismo que sostiene la escena y el cierre, que no han
// faltado ni una vez.
//
// Lo que se comprueba aqui:
//   1. que el esquema que sale por el cable pide los cinco bloques
//   2. que no lleva ni una palabra de esquema que esta API no acepte, que es
//      lo que devolveria un 400 y dejaria al cliente sin informe
//   3. que los bloques se juntan en el orden en que se leen
//   4. que el "tras_bloque" acaba colocando la escena y las frases grandes
//      detras del bloque que se ha pedido
//   5. que un bloque en blanco NO se entrega: se vuelve a pedir el area
//   6. que el suelo de parrafos que impone el esquema da las palabras que
//      pide el prompt
//
// Ejecutar:  node test/bloques-obligatorios.test.mjs
// No llama a nadie: intercepta fetch y mira lo que se iba a enviar.
// ═════════════════════════════════════════════════════════════════

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { analizarArea } from '../lib/bloques.js';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.join(AQUI, '..');
const SEPARADOR = '';

const TIENDA = new Map();
globalThis.__TIENDA = TIENDA;
const STRIPE_FALSO = `
export default function Stripe() {
  return { checkout: { sessions: {
    async retrieve(id) {
      const s = globalThis.__TIENDA.get(id);
      return s ? JSON.parse(JSON.stringify(s)) : null;
    },
    async update(id, { metadata }) {
      const s = globalThis.__TIENDA.get(id);
      s.metadata = {};
      for (const [k, v] of Object.entries(metadata)) {
        if (v !== '' && v != null) s.metadata[k] = String(v);
      }
      return JSON.parse(JSON.stringify(s));
    },
  } } };
}`;

const BLOQUES = ['arranque', 'hoy', 'origen', 'creencias', 'soltar'];
const ESCENA = 'Son las once de la noche y todavia estas repasando el movil con la luz apagada.';

// Un parrafo reconocible por su bloque y su numero, para poder comprobar el
// ORDEN en que salen sin depender de lo que digan. Llevan el nombre y una
// negrita a proposito, para que no salte ninguna de las OTRAS reparaciones y
// lo que se mida aqui sean solo los bloques.
const parrafoDe = (bloque, i, ladillo = null) => ({
  ladillo,
  texto: `Marca-${bloque}-${i}, y aqui va el texto de ese hueco, Ana, con su **frase marcada** dentro y alguna otra **cosa senalada** para que no falten.`,
});

// El area completa, con los huecos obligatorios de cada bloque llenos.
const OBLIGATORIOS = { arranque: 1, hoy: 4, origen: 2, creencias: 3, soltar: 1 };
function areaEntera(extra = {}) {
  const area = {
    escena: { tras_bloque: 'hoy', texto: ESCENA },
    remate_herida: { tras_bloque: 'creencias', texto: 'Llevas media vida pidiendo permiso para ocupar tu propio sitio' },
    remate_fuerza: { tras_bloque: 'arranque', texto: 'Nadie aguanta tanto tiempo de pie sin que eso sea una fuerza' },
    pregunta: { tras_bloque: 'origen', texto: '¿Cuantas veces te has callado algo por no montar un lio?' },
    cierre: 'Y hasta que no veas eso, vas a seguir buscando fuera lo que lleva anos esperandote dentro.',
  };
  for (const b of BLOQUES) {
    area[b] = {};
    for (let i = 1; i <= OBLIGATORIOS[b]; i++) {
      area[b]['p' + i] = parrafoDe(b, i, i === 1 && b !== 'arranque' ? `Lo que aprendiste en ${b}` : null);
    }
  }
  return JSON.stringify({ ...area, ...extra });
}

let devuelve = areaEntera();
const enviadas = [];
let llamadasDeArea = 0;
const anthropic = async (url, opts = {}) => {
  const cuerpo = JSON.parse(opts.body || '{}');
  enviadas.push(cuerpo);
  const sistema = String(Array.isArray(cuerpo.system) ? (cuerpo.system[0] || {}).text || '' : cuerpo.system || '');
  if (sistema.startsWith('Eres un corrector de estilo')) {
    return { ok: true, status: 200, json: async () => ({ content: [{ text: '{"frases":[]}' }] }) };
  }
  if (cuerpo.messages && cuerpo.messages[0] && cuerpo.messages[0].content === 'ok') {
    return { ok: true, status: 200, json: async () => ({ content: [{ text: '{' }] }) };
  }
  llamadasDeArea++;
  return { ok: true, status: 200, json: async () => ({ content: [{ text: devuelve }] }) };
};
globalThis.fetch = async (url, opts = {}) => {
  if (!String(url).includes('api.anthropic.com')) return { ok: true, status: 200, json: async () => ({}) };
  return anthropic(url, opts);
};

const stripeFalsoRuta = path.join(AQUI, '.stripe-falso-bloques.mjs');
const chatRuta = path.join(AQUI, '.chat-bloques-bajo-prueba.mjs');
const original = fs.readFileSync(path.join(RAIZ, 'api', 'chat.js'), 'utf8');
const MARCA = "import Stripe from 'stripe';";
if (!original.includes(MARCA)) {
  console.error('✘ api/chat.js ya no importa Stripe como se esperaba; hay que actualizar esta prueba.');
  process.exit(1);
}
fs.writeFileSync(stripeFalsoRuta, STRIPE_FALSO);
fs.writeFileSync(chatRuta, original.replace(MARCA, "import Stripe from './.stripe-falso-bloques.mjs';"));

process.env.STRIPE_SECRET_KEY = 'sk_test';
process.env.ANTHROPIC_API_KEY = 'sk-ant-test';
process.env.BREVO_API_KEY = '';
const limpiar = () => { for (const f of [stripeFalsoRuta, chatRuta]) try { fs.unlinkSync(f); } catch {} };

let fallos = 0;
const c = (desc, ok, det = '') => {
  console.log(`  ${ok ? '✔' : '✘ FALLA'}  ${desc}${det ? '  [' + det + ']' : ''}`);
  if (!ok) fallos++;
};

let n = 0;
async function generar(chat, area) {
  const sid = 'cs_test_bloques_' + (++n);
  TIENDA.set(sid, {
    id: sid, payment_status: 'paid', customer_email: 'cliente@ejemplo.com',
    customer_details: { email: 'cliente@ejemplo.com' }, metadata: { nombre: 'Ana Ruiz' },
  });
  if (area !== null) devuelve = area;
  llamadasDeArea = 0;
  enviadas.length = 0;
  const r = { code: 0, body: null };
  r.status = x => { r.code = x; return r; };
  r.json = b => { r.body = b; return r; };
  r.setHeader = () => {};
  await chat({ method: 'POST', body: { session_id: sid, nombre: 'Ana Ruiz', cartaTexto: 'Sol: Piscis' } }, r);
  return r;
}

try {
  const { default: chat } = await import(chatRuta);

  // ── 1. EL ESQUEMA QUE SALE POR EL CABLE ──────────────────────────
  console.log('\n  1. el esquema que se le manda al modelo\n');
  const r1 = await generar(chat, areaEntera());
  c('el informe sale', r1.code === 200, 'HTTP ' + r1.code);
  c('una sola llamada por área, sin repasos', llamadasDeArea === 7, llamadasDeArea + ' llamadas');

  // Solo las que llevan el prompt largo: las del area y la de arranque. Las
  // reparaciones cortas (el nombre, las negritas, el repaso que lee) llevan su
  // propio esquema y su propio prompt, y no entran en esta cache.
  const conEsquema = enviadas.filter(x => x.output_config
    && String((Array.isArray(x.system) ? (x.system[0] || {}).text : x.system) || '').startsWith('Eres una experta'));
  const esquema = conEsquema.length ? conEsquema[0].output_config.format.schema : null;
  c('la petición lleva esquema', Boolean(esquema));

  if (esquema) {
    for (const b of BLOQUES) {
      c(`el esquema pide el bloque "${b}"`,
        (esquema.required || []).includes(b) && esquema.properties[b] && esquema.properties[b].type === 'object');
    }
    c('y sigue pidiendo la escena, los dos remates, la pregunta y el cierre',
      ['escena', 'remate_herida', 'remate_fuerza', 'pregunta', 'cierre'].every(k => (esquema.required || []).includes(k)));
    c('ya no hay una casilla suelta "parrafos"', !esquema.properties.parrafos);

    // El suelo: los huecos que el modelo NO puede dejar sin escribir.
    const suelo = BLOQUES.reduce((t, b) => t + (esquema.properties[b].required || []).length, 0);
    const techo = BLOQUES.reduce((t, b) => t + Object.keys(esquema.properties[b].properties || {}).length, 0);
    c('el suelo son 11 párrafos obligatorios', suelo === 11, suelo + ' obligatorios');
    c('y hay huecos de más por encima, para el área que tenga más que contar',
      techo > suelo, techo + ' huecos en total');
    // 11 parrafos de unas 60 palabras son 660, mas la escena, los dos remates,
    // la pregunta y el cierre, que en el ultimo informe medido eran otras 230:
    // ahi estan las 850-900 que pide el prompt y que salian 690 de media.
    c('11 párrafos de 60 palabras + las casillas grandes llegan a las 850 que pide el prompt',
      suelo * 60 + 230 >= 850, (suelo * 60 + 230) + ' palabras de suelo');

    // ── 2. NI UNA PALABRA DE ESQUEMA QUE ESTA API NO ACEPTE ────────
    //
    // Esta API entiende solo un trozo de JSON Schema, y lo que no entiende NO
    // lo ignora: devuelve un 400 y el cliente se queda sin informe. minItems
    // solo admite 0 y 1, asi que el "minimo de parrafos" NO se puede pedir por
    // ahi y hay que pedirlo con huecos con nombre en "required", que es lo que
    // se hace. Aqui se llama a la API en crudo, sin SDK que limpie el esquema,
    // asi que esta comprobacion es lo unico que hay entre un minItems y una
    // venta perdida.
    const PROHIBIDAS = ['minLength', 'maxLength', 'pattern', 'format', 'minimum', 'maximum',
      'exclusiveMinimum', 'exclusiveMaximum', 'uniqueItems', 'maxItems', 'minProperties',
      'maxProperties', 'multipleOf'];
    const encontradas = [];
    const objetosSinCerrar = [];
    (function mirar(nodo, donde) {
      if (!nodo || typeof nodo !== 'object') return;
      if (Array.isArray(nodo)) { nodo.forEach((x, i) => mirar(x, `${donde}[${i}]`)); return; }
      for (const palabra of PROHIBIDAS) {
        if (palabra in nodo) encontradas.push(`${donde}.${palabra}`);
      }
      if ('minItems' in nodo && nodo.minItems !== 0 && nodo.minItems !== 1) {
        encontradas.push(`${donde}.minItems=${nodo.minItems}`);
      }
      if (nodo.type === 'object' && nodo.additionalProperties !== false) objetosSinCerrar.push(donde);
      for (const [k, v] of Object.entries(nodo)) mirar(v, `${donde}.${k}`);
    })(esquema, 'esquema');
    c('el esquema no lleva ni una palabra que esta API rechace', encontradas.length === 0, encontradas.join(', '));
    c('todos los objetos van con additionalProperties:false, como pide la API',
      objetosSinCerrar.length === 0, objetosSinCerrar.join(', '));

    // ── 3. Y EL MISMO EN LAS OCHO LLAMADAS, O LA CACHE NO ACIERTA ──
    const distintos = new Set(conEsquema.map(x => JSON.stringify(x.output_config)));
    c('las 7 áreas y el arranque mandan el MISMO esquema (si no, el prompt se paga 8 veces)',
      distintos.size === 1, distintos.size + ' esquemas distintos');
  }

  // ── 4. EL ORDEN EN QUE SE LEEN LOS BLOQUES ───────────────────────
  console.log('\n  2. los bloques salen en el orden en que se leen\n');
  const area1 = String(r1.body.texto).split(SEPARADOR)[0];
  const marcas = (area1.match(/Marca-[a-z]+-\d/g) || []);
  const esperado = ['arranque-1', 'hoy-1', 'hoy-2', 'hoy-3', 'hoy-4', 'origen-1', 'origen-2',
    'creencias-1', 'creencias-2', 'creencias-3', 'soltar-1'].map(x => 'Marca-' + x);
  c('los 11 párrafos salen, todos, una sola vez y en su orden',
    JSON.stringify(marcas) === JSON.stringify(esperado), marcas.length + ' de 11');

  // ── 5. Y LAS CASILLAS GRANDES, DETRAS DEL BLOQUE QUE SE PIDIO ────
  console.log('\n  3. cada casilla grande cae detrás de SU bloque\n');
  const bl = analizarArea(area1);
  const tras = (tipo, texto) => {
    const i = bl.findIndex(x => x.tipo === tipo && (!texto || x.t.includes(texto)));
    if (i <= 0) return null;
    for (let j = i - 1; j >= 0; j--) if (bl[j].tipo === 'texto' || bl[j].tipo === 'escena') return bl[j].t;
    return null;
  };
  c('la escena va detrás del último párrafo de HOY',
    String(tras('escena')).includes('Marca-hoy-4'), String(tras('escena')).slice(0, 30));
  c('la pregunta va detrás del último párrafo de ORIGEN',
    String(tras('pregunta')).includes('Marca-origen-2'), String(tras('pregunta')).slice(0, 30));
  c('el remate de la herida va detrás del último párrafo de CREENCIAS',
    String(tras('remate', 'pidiendo permiso')).includes('Marca-creencias-3'));
  c('el remate de la fuerza va detrás del párrafo del ARRANQUE',
    String(tras('remate', 'tanto tiempo de pie')).includes('Marca-arranque-1'));
  c('el cierre sigue siendo lo último del área', bl[bl.length - 1].tipo === 'cierre');

  // ── 6. UN BLOQUE EN BLANCO NO SE ENTREGA ─────────────────────────
  //
  // Es lo unico que la API no puede impedir: el hueco llega, pero vacio. Antes
  // eso se entregaba tal cual, y era justo el fallo (ORIGEN faltaba en 4 de las
  // 7 areas). Ahora el area se vuelve a pedir.
  console.log('\n  4. un bloque en blanco se vuelve a pedir, no se entrega\n');
  const sinOrigen = JSON.parse(areaEntera());
  sinOrigen.origen = { p1: { ladillo: null, texto: '   ' }, p2: { ladillo: null, texto: '' } };
  const r2 = await generar(chat, JSON.stringify(sinOrigen));
  c('con ORIGEN en blanco NO se entrega el informe', r2.code !== 200, 'HTTP ' + r2.code);
  c('y se ha vuelto a pedir el área, no se ha impreso a medias', llamadasDeArea > 7,
    llamadasDeArea + ' llamadas para 7 áreas');

  // Y si el bloque vuelve bien al siguiente intento, el informe sale.
  console.log('\n  5. y si al siguiente intento llega bien, el informe sale\n');
  const malas = new Set();
  globalThis.fetch = async (url, opts = {}) => {
    if (!String(url).includes('api.anthropic.com')) return { ok: true, status: 200, json: async () => ({}) };
    const cuerpo = JSON.parse(opts.body || '{}');
    const sistema = String(Array.isArray(cuerpo.system) ? (cuerpo.system[0] || {}).text || '' : cuerpo.system || '');
    const esArea = sistema.startsWith('Eres una experta') && cuerpo.messages[0].content !== 'ok';
    if (esArea) {
      // La primera vez que se pide CADA area llega sin ORIGEN; la segunda, bien.
      const cual = String(cuerpo.messages[0].content).match(/ÁREA (\d)/);
      const clave = cual ? cual[1] : '?';
      devuelve = malas.has(clave) ? areaEntera() : JSON.stringify(sinOrigen);
      malas.add(clave);
    }
    return anthropic(url, opts);
  };
  const r3 = await generar(chat, null);
  c('el informe sale', r3.code === 200, 'HTTP ' + r3.code);
  c('y las siete áreas llegan con su ORIGEN dentro',
    String(r3.body?.texto || '').split(SEPARADOR).filter(t => t.includes('Marca-origen-1')).length === 7,
    String(r3.body?.texto || '').split(SEPARADOR).filter(t => t.includes('Marca-origen-1')).length + ' de 7');

} catch (err) {
  console.error('\n  ✘ la prueba reventó:', err.stack || err.message);
  fallos++;
} finally {
  limpiar();
}

console.log(fallos ? `\n  ${fallos} COMPROBACIONES FALLIDAS\n` : '\n  todo pasa\n');
process.exit(fallos ? 1 : 0);
