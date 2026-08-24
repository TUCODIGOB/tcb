// ═════════════════════════════════════════════════════════════════
// test/rasgos.test.mjs
//
// LA LISTA DE RASGOS TIENE QUE LLEGAR AL PDF, Y NO PUEDE COSTAR UN OJO.
//
// El 24 de agosto la lista no salio en el informe, y no por un motivo sino
// por tres a la vez:
//
//   1. Se pedia el JSON por escrito, sin esquema, con hueco para 3.000
//      tokens. Veinte rasgos no caben ahi: la respuesta llegaba cortada a
//      mitad de una frase, JSON.parse reventaba y la lista se iba entera a
//      la basura ("Unterminated string in JSON at position 6991").
//   2. Iba con opus, cinco veces mas caro por token que el resto del
//      informe, para sacar veinte titulares de la carta.
//   3. Se pedia DETRAS de las siete areas, sumando su espera entera al
//      informe, que ya estaba en 3 minutos de un tope de 5.
//
// Y aunque se hubieran arreglado los tres, la lista tampoco habria salido:
// generando-informe.html no la mandaba a generar-pdf, donde la seccion
// entera va dentro de un "if (rasgos && ...)".
//
// Nada de esto se ve mirando el informe: sale un PDF correcto, sin una
// pagina que nadie echa en falta si no sabe que tenia que estar. Por eso se
// vigila aqui.
//
// Ejecutar:  node test/rasgos.test.mjs
// No llama a nadie: intercepta fetch y mira lo que se iba a enviar.
// ═════════════════════════════════════════════════════════════════

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.join(AQUI, '..');

let fallos = 0;
const comprobar = (desc, ok, detalle = '') => {
  console.log(`  ${ok ? '✔' : '✘ FALLA'}  ${desc}${detalle ? '  [' + detalle + ']' : ''}`);
  if (!ok) fallos++;
};

// ── LA TIENDA DE MENTIRA ──────────────────────────────────────────
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

// ── UN AREA CUALQUIERA, QUE AQUI NO ES LO QUE SE MIRA ──────────────
function porBloques(parrafos) {
  const nombres = ['arranque', 'hoy', 'origen', 'creencias', 'soltar'];
  const bloques = {};
  for (const nombre of nombres) bloques[nombre] = [];
  parrafos.forEach((p, i) => bloques[nombres[Math.min(i, nombres.length - 1)]].push(p));
  return { bloques };
}

const AREA = JSON.stringify({
  ...porBloques([
    { ladillo: null, texto: 'Te levantas y lo primero que haces es repasar la lista de lo que tienes pendiente, y eso lo llevas haciendo desde siempre.' },
    { ladillo: 'La cuenta que no llevas', texto: 'Y mientras asientes, Ana, por dentro **estas calculando cuanto has ensenado de mas**, que es un trabajo que no descansa.' },
    { ladillo: null, texto: 'De ahi sale todo lo demas, que es lo que nadie te ha contado y **llevas media vida pagando sin enterarte**.' },
    { ladillo: 'Donde empezo esto', texto: '**Eso no se arregla apretando mas**, se arregla mirando de donde viene y quien te enseno a hacerlo asi.' },
    { ladillo: null, texto: 'Y cuando por fin te sientas, la cabeza sigue repasando lo que queda para manana como si alguien lo fuera a corregir.' },
  ]),
  escena: { tras_bloque: 'arranque', texto: 'Son las once de la noche y todavia estas repasando el movil con la luz apagada.' },
  remate_herida: { tras_bloque: 'origen', texto: 'Llevas media vida pidiendo permiso para ocupar tu propio sitio' },
  remate_fuerza: { tras_bloque: 'creencias', texto: 'Nadie aguanta tanto tiempo de pie sin que eso sea una fuerza' },
  pregunta: { tras_bloque: 'hoy', texto: '¿Cuantas veces te has callado algo por no montar un lio?' },
  cierre: 'Y hasta que no veas eso, vas a seguir buscando fuera lo que lleva anos esperandote dentro.',
});

// ── LAS DOS LISTAS QUE DEVUELVE EL MODELO DE MENTIRA ───────────────
const unRasgo = (n, area) => ({
  nombre: `Rasgo numero ${n}`,
  descripcion: `La frase que describe el rasgo numero ${n} de esta persona, ni corta ni larga.`,
  explicacion: `De donde le viene el rasgo numero ${n} segun la carta, contado en una frase o dos que expliquen el por que.`,
  area,
});
const RASGOS = {
  fortalezas: Array.from({ length: 10 }, (_, i) => unRasgo(i + 1, (i % 7) + 1)),
  desafios: Array.from({ length: 10 }, (_, i) => unRasgo(i + 11, (i % 7) + 1)),
};

// ── LA PUERTA QUE DEJA VER SI LA LISTA SALE ANTES O DESPUES ────────
//
// Las siete areas se quedan paradas en la puerta sin contestar. Cuando ya
// estan las siete esperando, se mira si la lista se ha pedido: si esta
// pedida es que va en paralelo, y si no, es que estaba esperando su turno
// detras de ellas. Entonces se abre la puerta y el informe sigue.
//
// Se mira asi, y no contando vueltas del bucle de eventos, porque el numero
// de vueltas que hacen falta depende de por donde pase el codigo, y una
// prueba que a veces pasa y a veces no es peor que no tenerla.
let abrirLaPuerta;
const puerta = new Promise(r => { abrirLaPuerta = r; });

let lasSieteEnLaPuerta;
const sieteEsperando = new Promise(r => { lasSieteEnLaPuerta = r; });
let areasEnLaPuerta = 0;
let laListaYaEstabaPedida = false;

// Como contesta el modelo cuando se le pide la lista: bien, cortada por
// haberse quedado sin sitio, o directamente un corte de red.
let comoSalePedirLaLista = 'bien';

const enviadas = [];
globalThis.fetch = async (url, opts = {}) => {
  if (!String(url).includes('api.anthropic.com')) {
    return { ok: true, status: 200, json: async () => ({}) };
  }
  const cuerpo = JSON.parse(opts.body || '{}');
  enviadas.push(cuerpo);

  const sistema = String(Array.isArray(cuerpo.system) ? (cuerpo.system[0] || {}).text || '' : cuerpo.system || '');

  if (sistema.startsWith('Eres una experta en astrología que analiza cartas natales')) {
    laListaYaEstabaPedida = true;
    if (comoSalePedirLaLista === 'red') throw new Error('fetch failed');
    if (comoSalePedirLaLista === 'cortada') {
      // Lo que llegaba el 24 de agosto: JSON a medias porque no cabia.
      const aMedias = JSON.stringify(RASGOS).slice(0, 6991);
      return { ok: true, status: 200, json: async () => ({ stop_reason: 'max_tokens', content: [{ type: 'text', text: aMedias }] }) };
    }
    return { ok: true, status: 200, json: async () => ({ stop_reason: 'end_turn', content: [{ type: 'text', text: JSON.stringify(RASGOS) }] }) };
  }
  if (sistema.startsWith('Eres un corrector de estilo')) {
    return { ok: true, status: 200, json: async () => ({ content: [{ text: '{"frases":[]}' }] }) };
  }
  if (cuerpo.messages && cuerpo.messages[0] && cuerpo.messages[0].content === 'ok') {
    return { ok: true, status: 200, json: async () => ({ content: [{ text: '{' }] }) };
  }
  // Un area: se pone en la puerta y espera a que la abran.
  areasEnLaPuerta++;
  if (areasEnLaPuerta === 7) lasSieteEnLaPuerta();
  await puerta;
  return { ok: true, status: 200, json: async () => ({ content: [{ text: AREA }] }) };
};

// ── EL chat.js DE VERDAD, CON LA TIENDA CAMBIADA ───────────────────
const stripeFalsoRuta = path.join(AQUI, '.stripe-falso-rasgos.mjs');
const chatRuta = path.join(AQUI, '.chat-rasgos-bajo-prueba.mjs');
const original = fs.readFileSync(path.join(RAIZ, 'api', 'chat.js'), 'utf8');
const MARCA = "import Stripe from 'stripe';";
if (!original.includes(MARCA)) {
  console.error('✘ api/chat.js ya no importa Stripe como se esperaba; hay que actualizar esta prueba.');
  process.exit(1);
}
fs.writeFileSync(stripeFalsoRuta, STRIPE_FALSO);
fs.writeFileSync(chatRuta, original.replace(MARCA, "import Stripe from './.stripe-falso-rasgos.mjs';"));

process.env.STRIPE_SECRET_KEY = 'sk_test';
process.env.ANTHROPIC_API_KEY = 'sk-ant-test';
process.env.BREVO_API_KEY = '';

const limpiar = () => { for (const f of [stripeFalsoRuta, chatRuta]) try { fs.unlinkSync(f); } catch {} };

try {
  const { default: chat } = await import(chatRuta);
  const SID = 'cs_test_rasgos';
  TIENDA.set(SID, {
    id: SID, payment_status: 'paid', customer_email: 'cliente@ejemplo.com',
    customer_details: { email: 'cliente@ejemplo.com' }, metadata: { nombre: 'Ana Ruiz' },
  });
  const r = { code: 0, body: null };
  r.status = c => { r.code = c; return r; };
  r.json = b => { r.body = b; return r; };
  r.setHeader = () => {};

  const informe = chat({ method: 'POST', body: { session_id: SID, nombre: 'Ana Ruiz', sexo: 'mujer', cartaTexto: 'Sol: Piscis' } }, r);

  // Con las siete areas paradas en la puerta, se mira si la lista ya se ha
  // pedido. Y luego se abre y el informe termina.
  await sieteEsperando;
  const laListaEstabaPedida = laListaYaEstabaPedida;
  abrirLaPuerta();
  await informe;

  console.log('\n  api/chat.js — la lista de rasgos\n');
  comprobar('el informe sale', r.code === 200, 'HTTP ' + r.code);

  const lista = enviadas.find(c => String(c.system || '').startsWith('Eres una experta en astrología que analiza cartas natales'));
  comprobar('se pide la lista de rasgos', Boolean(lista));

  // ── 1. QUE LLEGUE ENTERA ────────────────────────────────────────
  if (lista) {
    comprobar('la lista se pide CON esquema, no pidiendo JSON por escrito',
      lista.output_config?.format?.type === 'json_schema',
      lista.output_config ? 'con esquema' : 'SIN esquema: el JSON puede llegar cortado');

    const esquema = lista.output_config?.format?.schema;
    comprobar('el esquema es el de los rasgos',
      Boolean(esquema?.properties?.fortalezas && esquema?.properties?.desafios));

    // Esta API solo admite minItems 0 y 1. Un minItems: 10 lo rechaza de
    // entrada con un 400 y la lista no llega nunca.
    const topes = [];
    (function mirar(n) {
      if (!n || typeof n !== 'object') return;
      if (n.minItems !== undefined && n.minItems > 1) topes.push('minItems: ' + n.minItems);
      if (n.maxItems !== undefined) topes.push('maxItems: ' + n.maxItems);
      for (const v of Object.values(n)) mirar(v);
    })(esquema);
    comprobar('el esquema no lleva topes de lista que la API rechaza con un 400',
      topes.length === 0, topes.join(', '));

    comprobar('hay sitio de sobra para las dos listas enteras',
      lista.max_tokens >= 6000, 'max_tokens=' + lista.max_tokens);
  }

  // ── 2. QUE NO CUESTE UN OJO ─────────────────────────────────────
  if (lista) {
    comprobar('la lista va con el mismo modelo que las áreas, no con uno más caro',
      lista.model === 'claude-sonnet-5', lista.model);
  }

  // ── 3. QUE NO SUME TIEMPO ───────────────────────────────────────
  comprobar('la lista se pide A LA VEZ que las áreas, no detrás',
    laListaEstabaPedida,
    laListaEstabaPedida ? 'ya estaba pedida con las 7 áreas en vuelo'
                        : 'esperó a que terminaran las áreas: suma su espera entera');

  // ── 4. QUE SALGA POR LA PUERTA HACIA EL PDF ─────────────────────
  comprobar('el informe devuelve los rasgos', Boolean(r.body?.rasgos));
  comprobar('devuelve las dos listas completas',
    r.body?.rasgos?.fortalezas?.length === 10 && r.body?.rasgos?.desafios?.length === 10,
    `${r.body?.rasgos?.fortalezas?.length} fortalezas, ${r.body?.rasgos?.desafios?.length} desafíos`);
  const uno = r.body?.rasgos?.fortalezas?.[0];
  comprobar('cada rasgo llega con sus cuatro casillas',
    Boolean(uno?.nombre && uno?.descripcion && uno?.explicacion && uno?.area >= 1 && uno?.area <= 7));

  // ── 5. SI LA LISTA FALLA, EL INFORME SE ENTREGA IGUAL ───────────
  //
  // La lista es un extra. Las siete areas son lo que el cliente ha pagado, y
  // cuando la lista se pide ya estan escritas: que se caigan por esto seria
  // cambiar una pagina que falta por un informe entero que no llega.
  console.log('\n  api/chat.js — y si la lista falla\n');

  for (const [modo, cuento] of [['cortada', 'la respuesta llega cortada'], ['red', 'se cae la red al pedirla']]) {
    comoSalePedirLaLista = modo;
    const SID2 = 'cs_test_rasgos_' + modo;
    TIENDA.set(SID2, {
      id: SID2, payment_status: 'paid', customer_email: 'cliente@ejemplo.com',
      customer_details: { email: 'cliente@ejemplo.com' }, metadata: { nombre: 'Ana Ruiz' },
    });
    const r2 = { code: 0, body: null };
    r2.status = c => { r2.code = c; return r2; };
    r2.json = b => { r2.body = b; return r2; };
    r2.setHeader = () => {};
    await chat({ method: 'POST', body: { session_id: SID2, nombre: 'Ana Ruiz', sexo: 'mujer', cartaTexto: 'Sol: Piscis' } }, r2);

    comprobar(`si ${cuento}, el informe se entrega igual`, r2.code === 200, 'HTTP ' + r2.code);
    comprobar(`si ${cuento}, las 7 áreas llegan enteras`,
      String(r2.body?.texto || '').split('\u001F').filter(t => t.trim()).length === 7);
    comprobar(`si ${cuento}, el PDF sale sin esa página en vez de no salir`,
      r2.body?.rasgos?.fortalezas?.length === 0 && r2.body?.rasgos?.desafios?.length === 0);
  }

} catch (err) {
  console.error('\n  ✘ la prueba reventó:', err.stack || err.message);
  fallos++;
} finally {
  limpiar();
}

// ── 6. Y QUE EL NAVEGADOR LA MANDE AL PDF ─────────────────────────
//
// El eslabon que faltaba: chat.js puede devolver la lista perfecta, que si
// generando-informe.html no la mete en la peticion de generar-pdf, alli la
// seccion entera se salta y el PDF sale sin esa pagina.
console.log('\n  generando-informe.html — la lista llega hasta el PDF\n');
const html = fs.readFileSync(path.join(RAIZ, 'generando-informe.html'), 'utf8');
const peticion = html.slice(html.indexOf("fetch('/api/generar-pdf'"));
const cuerpoPeticion = peticion.slice(0, peticion.indexOf('})'));
comprobar('el navegador recoge los rasgos de la respuesta de /api/chat',
  /_G\.rasgos\s*=\s*data\.rasgos/.test(html));
comprobar('y los mete en la petición a /api/generar-pdf',
  /rasgos:\s*_G\.rasgos/.test(cuerpoPeticion));

// Y que generar-pdf siga pintando la seccion cuando le llegan.
const pdf = fs.readFileSync(path.join(RAIZ, 'api', 'generar-pdf.js'), 'utf8');
comprobar('generar-pdf lee los rasgos de la petición',
  /const\s*\{[^}]*\brasgos\b[^}]*\}\s*=\s*req\.body/.test(pdf));
comprobar('y pinta la sección cuando vienen',
  /if\s*\(\s*rasgos\s*&&/.test(pdf));

// ── 7. Y QUE LA PAGINA APAREZCA DE VERDAD EN EL PDF ───────────────
//
// Todo lo de arriba puede estar bien y la pagina no salir igualmente: es lo
// que paso el 24 de agosto. Asi que aqui se fabrica el PDF de verdad, con la
// lista y sin ella, y se cuentan las paginas. Si la lista no pinta nada, los
// dos PDF tienen las mismas.
console.log('\n  api/generar-pdf.js — la página sale en el PDF\n');

let jspdfHay = true;
try { await import('jspdf'); } catch { jspdfHay = false; }

if (!jspdfHay) {
  console.log('  SALTADA: falta jspdf. Ejecuta "npm install" en la raíz del repo.');
  console.log('  La página del PDF NO se ha comprobado.');
} else {
  const copias = [];
  const stripePdf = path.join(AQUI, '.stripe-falso-rasgos-pdf.mjs');
  fs.writeFileSync(stripePdf, `
export default function Stripe() {
  return { checkout: { sessions: {
    async retrieve() {
      return { payment_status: 'paid', customer_email: 'prueba@ejemplo.com',
               customer_details: {}, metadata: { generacion_token: 'tok' } };
    },
    async update() {},
  } } };
}`);
  copias.push(stripePdf);
  const copiarApi = (api, destino) => {
    const o = fs.readFileSync(path.join(RAIZ, 'api', api), 'utf8');
    const r = path.join(AQUI, destino);
    fs.writeFileSync(r, o.replace(MARCA, "import Stripe from './.stripe-falso-rasgos-pdf.mjs';"));
    copias.push(r);
    return r;
  };

  // El PDF lee sus imagenes y sus fuentes del propio repo, no por red.
  globalThis.fetch = async (url) => {
    const u = String(url);
    if (u.includes('api.brevo.com')) return { ok: true, status: 201, json: async () => ({}) };
    const b = fs.readFileSync(path.join(RAIZ, u.replace('https://origennatal.com', '')));
    return { ok: true, status: 200, arrayBuffer: async () => b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) };
  };

  try {
    const { default: calcularCarta } = await import(copiarApi('calcular-carta.js', '.carta-rasgos.mjs'));
    const { default: generarPdf } = await import(copiarApi('generar-pdf.js', '.pdf-rasgos.mjs'));

    const resp = () => {
      const r = { code: 0, body: null };
      r.status = x => { r.code = x; return r; };
      r.json = b => { r.body = b; return r; };
      r.setHeader = () => {};
      return r;
    };

    const rc = resp();
    await calcularCarta({ method: 'POST', body: { session_id: 'x', year: 1990, month: 6, day: 12, localHour: 9, localMin: 30, latDeg: 40.4168, lonDeg: -3.7038, tzOffset: 2 } }, rc);

    const parrafo = 'Parrafo de prueba con la longitud habitual de un informe real de cliente para que el documento salga como siempre.';
    const pedido = {
      session_id: 'x', token: 'tok', nombre: 'Prueba Rasgos', sexo: 'Mujer',
      fechaNice: '12 de junio de 1990', hora: '09:30', lugar: 'Madrid, España',
      edad: 35, carta: rc.body, areas: Array(7).fill(parrafo),
    };

    const cuantasPaginas = async (extra) => {
      const r = resp();
      await generarPdf({ method: 'POST', body: { ...pedido, ...extra } }, r);
      if (r.code !== 200) return -1;
      const buf = Buffer.from(r.body.pdfBase64.split(',')[1], 'base64');
      return (buf.toString('latin1').match(/\/Type\s*\/Page[^s]/g) || []).length;
    };

    const sinLista = await cuantasPaginas({});
    const conLista = await cuantasPaginas({ rasgos: RASGOS });
    const listaVaciaPdf = await cuantasPaginas({ rasgos: { fortalezas: [], desafios: [] } });

    comprobar('el PDF se genera sin lista (como hasta ahora)', sinLista > 0, sinLista + ' páginas');
    comprobar('el PDF se genera con lista', conLista > 0, conLista + ' páginas');
    comprobar('los 20 rasgos AÑADEN páginas al informe',
      conLista > sinLista,
      conLista > sinLista ? `${sinLista} → ${conLista} páginas`
                          : 'mismas páginas: la lista no se está pintando');
    comprobar('con la lista vacía el informe sale como siempre, sin páginas en blanco',
      listaVaciaPdf === sinLista, listaVaciaPdf + ' páginas');

  } catch (err) {
    console.error('  ✘ la parte del PDF reventó:', err.stack || err.message);
    fallos++;
  } finally {
    for (const f of copias) try { fs.unlinkSync(f); } catch {}
  }
}

console.log(fallos ? `\n  ${fallos} COMPROBACIONES FALLIDAS\n` : '\n  todo pasa\n');
process.exit(fallos ? 1 : 0);
