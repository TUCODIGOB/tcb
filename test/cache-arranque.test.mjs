// ═════════════════════════════════════════════════════════════════
// test/cache-arranque.test.mjs
//
// EL PROMPT SE PAGA UNA VEZ, NO SIETE.
//
// El prompt del sistema son 22.000 tokens y viaja en las siete llamadas
// del informe. Marcandolo con cache_control, la primera cuesta y las
// otras seis cuestan una decima parte. Para eso hay una llamada de
// arranque que lo deja escrito antes de que salgan las siete.
//
// La cache acierta comparando el PRINCIPIO de la peticion, y el esquema
// de casillas va delante del prompt. En el informe del 23 de agosto la
// llamada de arranque iba sin ese esquema y las siete areas con el: para
// la cache eran dos peticiones distintas, ninguna area encontraba lo que
// dejo el arranque, y el prompt se pago entero doce veces. 268.000 tokens,
// dos tercios de la factura de ese informe.
//
// Eso no se ve mirando el informe, que sale igual de bien. Solo se ve en
// la factura, y un mes despues. Por eso se vigila aqui.
//
// Lo que se comprueba: que la llamada de arranque y la de un area lleven
// EXACTAMENTE lo mismo en todo lo que la cache mira. Si algun dia se le
// anade algo a la del area y no aqui, esta prueba se cae.
//
// Ejecutar:  node test/cache-arranque.test.mjs
// No llama a nadie: intercepta fetch y mira lo que se iba a enviar.
// ═════════════════════════════════════════════════════════════════

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.join(AQUI, '..');

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


// El area se pide con una casilla por bloque, no con una lista sola: ver
// ESQUEMA_AREA_POR_BLOQUES en api/chat.js. Esto reparte una lista de parrafos
// por los cinco bloques en el mismo orden en que el codigo los vuelve a juntar,
// asi que el texto que sale es identico al de la lista. Los cinco tienen que
// llevar algo: un bloque vacio es el fallo que esto viene a impedir.
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
    { ladillo: null, pregunta: '¿cuando fue la ultima vez que soltaste algo sin repasarlo?', texto: 'De ahi sale todo lo demas, que es lo que nadie te ha contado y **llevas media vida pagando sin enterarte**. ¿Cuando fue la ultima vez que soltaste algo sin repasarlo? Piensalo despacio.' },
    { ladillo: 'Donde empezo esto', texto: '**Eso no se arregla apretando mas**, se arregla mirando de donde viene y quien te enseno a hacerlo asi.' },
    { ladillo: null, texto: 'Y cuando por fin te sientas, la cabeza sigue repasando lo que queda para manana como si alguien lo fuera a corregir.' },
  ]),
  escena: { tras_bloque: 'arranque', texto: 'Son las once de la noche y todavia estas repasando el movil con la luz apagada.' },
  remate_herida: { tras_bloque: 'origen', texto: 'Llevas media vida pidiendo permiso para ocupar tu propio sitio' },
  remate_fuerza: { tras_bloque: 'creencias', texto: 'Nadie aguanta tanto tiempo de pie sin que eso sea una fuerza' },
  pregunta: { tras_bloque: 'hoy', texto: '¿Cuantas veces te has callado algo por no montar un lio?' },
  cierre: { revela: 'que la prueba se la puso ella y nadie se la pidio', texto: 'Y hasta que no veas eso, vas a seguir buscando fuera lo que lleva anos esperandote dentro.' },
});

// Se guarda lo que se iba a enviar en cada llamada, sin enviarlo.
const enviadas = [];
globalThis.fetch = async (url, opts = {}) => {
  if (!String(url).includes('api.anthropic.com')) {
    return { ok: true, status: 200, json: async () => ({}) };
  }
  const cuerpo = JSON.parse(opts.body || '{}');
  enviadas.push(cuerpo);
  const sistema = String(Array.isArray(cuerpo.system) ? (cuerpo.system[0] || {}).text || '' : cuerpo.system || '');
  if (sistema.startsWith('Eres un corrector de estilo')) {
    return { ok: true, status: 200, json: async () => ({ content: [{ text: '{"frases":[]}' }] }) };
  }
  if (cuerpo.messages && cuerpo.messages[0] && cuerpo.messages[0].content === 'ok') {
    return { ok: true, status: 200, json: async () => ({ content: [{ text: '{' }] }) };
  }
  return { ok: true, status: 200, json: async () => ({ content: [{ text: AREA }] }) };
};

const stripeFalsoRuta = path.join(AQUI, '.stripe-falso-cache.mjs');
const chatRuta = path.join(AQUI, '.chat-cache-bajo-prueba.mjs');
const original = fs.readFileSync(path.join(RAIZ, 'api', 'chat.js'), 'utf8');
const MARCA = "import Stripe from 'stripe';";
if (!original.includes(MARCA)) {
  console.error('✘ api/chat.js ya no importa Stripe como se esperaba; hay que actualizar esta prueba.');
  process.exit(1);
}
fs.writeFileSync(stripeFalsoRuta, STRIPE_FALSO);
fs.writeFileSync(chatRuta, original.replace(MARCA, "import Stripe from './.stripe-falso-cache.mjs';"));

process.env.STRIPE_SECRET_KEY = 'sk_test';
process.env.ANTHROPIC_API_KEY = 'sk-ant-test';
process.env.BREVO_API_KEY = '';

const limpiar = () => { for (const f of [stripeFalsoRuta, chatRuta]) try { fs.unlinkSync(f); } catch {} };

let fallos = 0;
const comprobar = (desc, ok, detalle = '') => {
  console.log(`  ${ok ? '✔' : '✘ FALLA'}  ${desc}${detalle ? '  [' + detalle + ']' : ''}`);
  if (!ok) fallos++;
};

try {
  const { default: chat } = await import(chatRuta);
  const SID = 'cs_test_cache';
  TIENDA.set(SID, {
    id: SID, payment_status: 'paid', customer_email: 'cliente@ejemplo.com',
    customer_details: { email: 'cliente@ejemplo.com' }, metadata: { nombre: 'Ana Ruiz' },
  });
  const r = { code: 0, body: null };
  r.status = c => { r.code = c; return r; };
  r.json = b => { r.body = b; return r; };
  r.setHeader = () => {};
  await chat({ method: 'POST', body: { session_id: SID, nombre: 'Ana Ruiz', cartaTexto: 'Sol: Piscis' } }, r);

  console.log('\n  api/chat.js — el prompt se paga una vez, no siete\n');
  comprobar('el informe sale', r.code === 200, 'HTTP ' + r.code);

  // La de arranque es la unica cuyo mensaje es "ok".
  const arranque = enviadas.find(c => c.messages && c.messages[0] && c.messages[0].content === 'ok');
  // Las de area son las que llevan el prompt largo del sistema y piden un area.
  const areas = enviadas.filter(c => c !== arranque
    && Array.isArray(c.system)
    && String((c.system[0] || {}).text || '').startsWith('Eres una experta'));

  comprobar('sale la llamada de arranque', Boolean(arranque));
  comprobar('salen las 7 llamadas de área', areas.length === 7, areas.length + ' llamadas');

  if (arranque && areas.length > 0) {
    const area = areas[0];

    // ── LO QUE LA CACHE MIRA ────────────────────────────────────
    // Es el principio de la peticion: el esquema (que va delante) y el
    // prompt del sistema con su marca. Si algo de esto no coincide, la
    // cache no acierta y el prompt se paga entero en cada area.
    comprobar('el arranque manda el MISMO esquema de casillas que el área',
      JSON.stringify(arranque.output_config) === JSON.stringify(area.output_config),
      arranque.output_config ? 'coinciden' : 'el arranque va SIN esquema');

    comprobar('el arranque manda el MISMO prompt, letra por letra',
      JSON.stringify(arranque.system) === JSON.stringify(area.system));

    comprobar('el prompt va marcado para guardar en caché',
      arranque.system?.[0]?.cache_control?.type === 'ephemeral'
      && area.system?.[0]?.cache_control?.type === 'ephemeral');

    comprobar('el arranque usa el mismo modelo', arranque.model === area.model, arranque.model);
    comprobar('el arranque razona igual que el área (o sea, nada)',
      JSON.stringify(arranque.thinking) === JSON.stringify(area.thinking));

    // Y que el arranque no se ponga a escribir: solo tiene que dejar la
    // cache escrita. Lo que escriba se paga.
    comprobar('el arranque no escribe nada apreciable',
      arranque.max_tokens <= 32, 'max_tokens=' + arranque.max_tokens);

    // Las 7 areas tienen que pedir todas lo mismo por delante: si una sola
    // se desviara, esa se pagaria entera.
    const iguales = areas.every(a =>
      JSON.stringify(a.system) === JSON.stringify(area.system)
      && JSON.stringify(a.output_config) === JSON.stringify(area.output_config));
    comprobar('las 7 áreas piden todas lo mismo por delante', iguales);

    // Lo que cambia en cada area viaja DETRAS de la marca, en messages.
    const distintos = new Set(areas.map(a => JSON.stringify(a.messages)));
    comprobar('lo que cambia de cada área va detrás, en el mensaje',
      distintos.size === 7, distintos.size + ' mensajes distintos de 7');
  }

} catch (err) {
  console.error('\n  ✘ la prueba reventó:', err.stack || err.message);
  fallos++;
} finally {
  limpiar();
}

console.log(fallos ? `\n  ${fallos} COMPROBACIONES FALLIDAS\n` : '\n  todo pasa\n');
process.exit(fallos ? 1 : 0);
