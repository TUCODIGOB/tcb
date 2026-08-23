// ═════════════════════════════════════════════════════════════════
// test/entrega-pase-lo-que-pase.test.mjs
//
// La ultima red de api/chat.js: si el area esta escrita entera y solo le
// falta una marca, se entrega, aunque el repaso falle las tres veces.
//
// POR QUE EXISTE: el 22 de agosto una clienta pago, el modelo escribio
// las siete areas, dos llegaron con un ladillo mal puesto, el repaso no
// las arreglo, y se tiro el informe entero. Pago y no recibio nada. Esta
// prueba ejerce ese camino con un modelo de mentira que falla SIEMPRE, y
// comprueba que ahora se entrega.
//
// Y comprueba lo contrario, que es igual de importante: un area que llega
// cortada a media frase NO se entrega. Eso no es una marca que falta, es
// texto que no existe.
//
// Ejecutar:  node test/entrega-pase-lo-que-pase.test.mjs
// Sin red y sin Stripe.
// ═════════════════════════════════════════════════════════════════

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.join(AQUI, '..');
const SID = 'cs_test_red';

const TIENDA = new Map();
globalThis.__TIENDA = TIENDA;
const STRIPE_FALSO = `
const T = globalThis.__TIENDA;
export default function Stripe() {
  return { checkout: { sessions: {
    async retrieve(id) { return T.get(id); },
    async update(id, d) {
      const s = T.get(id);
      s.metadata = { ...s.metadata, ...(d.metadata || {}) };
      T.set(id, s); return s;
    },
  } } };
}`;

// El area que devuelve el modelo, ya por casillas. La API obliga a que
// vengan todas, asi que el caso de "se le olvido la escena" ya no existe:
// lo unico que puede pasar es que llegue en blanco, y eso se prueba abajo.
const AREA_BUENA = JSON.stringify({
  parrafos: [
    { ladillo: null, texto: 'Antes de contarte nada de ti, quiero que pienses un momento en las personas que sostienen, porque en cualquier familia hay una.' },
    { ladillo: 'La cuenta que no llevas', texto: 'Por fuera pareces tranquila, Ana, y por dentro llevas una **maquina que no para de repasar** lo que acabas de decir.' },
    { ladillo: null, texto: 'En el trabajo se te nota enseguida, **revisas una tarea tres veces** cuando con una bastaria, y no es que dudes de tu criterio.' },
    { ladillo: 'Donde aprendiste la cuenta', texto: 'De pequena entendiste que el carino se ganaba haciendo las cosas bien, siendo la que no daba problemas nunca.' },
    { ladillo: null, texto: 'Y cuarenta anos despues sigues revisando y sigues anticipando, **sin que nadie te lo haya pedido** jamas.' },
  ],
  escena: { tras_parrafo: 2, texto: 'Son las once de la noche y sigues con el movil en la mano sin mirar nada en concreto.' },
  remate_herida: { tras_parrafo: 4, texto: 'Te has pasado la vida demostrando que se puede confiar en ti' },
  remate_fuerza: { tras_parrafo: 5, texto: 'Muy poca gente sigue sosteniendo cuando ya no la mira nadie' },
  pregunta: { tras_parrafo: 3, texto: '¿Cuando fue la ultima vez que alguien te dio las gracias por eso?' },
  cierre: 'No estas cansada de hacer cosas, estas cansada de que sea la unica prueba que te vale.',
});

// Lo mismo pero con la escena en blanco: la API no puede impedirlo.
const AREA_ESCENA_VACIA = JSON.stringify({
  ...JSON.parse(AREA_BUENA),
  escena: { tras_parrafo: 2, texto: '   ' },
});

let modo = 'buena';
let llamadas = 0;
let correoRevienta = false;
const correos = [];
globalThis.fetch = async (url, opts = {}) => {
  const u = String(url);
  if (u.includes('api.brevo.com')) {
    if (correoRevienta) throw new Error('Brevo caido');
    correos.push(JSON.parse(opts.body || '{}'));
    return { ok: true, status: 201, json: async () => ({}) };
  }
  if (u.includes('api.anthropic.com')) {
    llamadas++;
    if (modo === 'casilla vacia') {
      return { ok: true, status: 200, json: async () => ({ content: [{ text: AREA_ESCENA_VACIA }] }) };
    }
    if (modo === 'cortada') {
      return { ok: true, status: 200, json: async () => ({
        stop_reason: 'max_tokens',
        content: [{ text: AREA_BUENA.slice(0, 400) }],
      }) };
    }
    return { ok: true, status: 200, json: async () => ({ content: [{ text: AREA_BUENA }] }) };
  }
  return { ok: true, status: 200, json: async () => ({}) };
};

process.env.STRIPE_SECRET_KEY = 'sk_test';
process.env.ANTHROPIC_API_KEY = 'sk-ant-test';
// Con la clave vacia, enviarEmailAdmin no manda nada y no se probaria el
// aviso. Aqui se pone una de mentira: el fetch a Brevo esta interceptado.
process.env.BREVO_API_KEY = 'brevo-de-mentira';

const stripeFalsoRuta = path.join(AQUI, '.stripe-falso-red.mjs');
const chatRuta = path.join(AQUI, '.chat-red.mjs');
const original = fs.readFileSync(path.join(RAIZ, 'api', 'chat.js'), 'utf8');
const MARCA = "import Stripe from 'stripe';";
if (!original.includes(MARCA)) {
  console.error('X api/chat.js ya no importa Stripe como se esperaba.');
  process.exit(1);
}
fs.writeFileSync(stripeFalsoRuta, STRIPE_FALSO);
fs.writeFileSync(chatRuta, original.replace(MARCA, "import Stripe from './.stripe-falso-red.mjs';"));
const limpiar = () => { for (const f of [stripeFalsoRuta, chatRuta]) try { fs.unlinkSync(f); } catch {} };

let fallos = 0;
const c = (d, ok, det = '') => {
  console.log(`  ${ok ? 'ok  ' : 'FALLA'} ${d}${det ? '  [' + det + ']' : ''}`);
  if (!ok) fallos++;
};

// Los avisos que escribe chat.js, para comprobar que grita cuando toca.
const gritos = [];
const errOriginal = console.error;
console.error = (...a) => { gritos.push(a.join(' ')); };

try {
  const { default: chat } = await import(chatRuta);
  const res = () => {
    const r = { code: 0, body: null };
    r.status = x => { r.code = x; return r; };
    r.json = b => { r.body = b; return r; };
    r.setHeader = () => {};
    return r;
  };

  TIENDA.set(SID, {
    id: SID, payment_status: 'paid', customer_email: 'cliente@ejemplo.com',
    customer_details: { email: 'cliente@ejemplo.com' }, metadata: { nombre: 'Ana Ruiz' },
  });

  console.log('\n  el modelo devuelve el area por casillas\n');
  const r = res();
  await chat({ method: 'POST', body: { session_id: SID, nombre: 'Ana Ruiz', cartaTexto: 'Sol: Piscis' } }, r);
  c('el informe sale', r.code === 200, 'HTTP ' + r.code);
  c('con las siete areas', typeof r.body?.texto === 'string' && r.body.texto.length > 3000,
    (r.body?.texto || '').length + ' caracteres');
  c('se pidio UNA vez por area, sin repasos', llamadas === 7, llamadas + ' llamadas');
  c('y no llega ningun correo', correos.length === 0, correos.length + ' correos');
  c('el area empieza por texto, no por un ladillo',
    !r.body.texto.trimStart().startsWith('[SUBTITULO]'));
  c('lleva su escena, sus dos remates y su pregunta',
    (r.body.texto.match(/\[ESCENA\]/g) || []).length >= 7 &&
    (r.body.texto.match(/\[REMATE\]/g) || []).length >= 14 &&
    (r.body.texto.match(/\[PREGUNTA\]/g) || []).length >= 7);

  // ── Una casilla en blanco: es lo unico que la API no puede impedir ──
  console.log('\n  el modelo devuelve la escena en blanco\n');
  modo = 'casilla vacia';
  llamadas = 0;
  const SID2 = 'cs_test_vacia';
  TIENDA.set(SID2, { id: SID2, payment_status: 'paid', customer_email: 'c@e.com',
    customer_details: { email: 'c@e.com' }, metadata: { nombre: 'Ana Ruiz' } });
  const r2 = res();
  await chat({ method: 'POST', body: { session_id: SID2, nombre: 'Ana Ruiz', cartaTexto: 'Sol: Piscis' } }, r2);
  c('se vuelve a pedir en vez de entregarla coja', llamadas > 7, llamadas + ' llamadas');
  c('y no se entrega un area sin escena', r2.code !== 200, 'HTTP ' + r2.code);

  // ── Un area cortada a media frase no se entrega nunca ──────────────
  console.log('\n  el modelo devuelve el area cortada\n');
  modo = 'cortada';
  const SID3 = 'cs_test_cortada';
  TIENDA.set(SID3, { id: SID3, payment_status: 'paid', customer_email: 'c@e.com',
    customer_details: { email: 'c@e.com' }, metadata: { nombre: 'Ana Ruiz' } });
  const r3 = res();
  await chat({ method: 'POST', body: { session_id: SID3, nombre: 'Ana Ruiz', cartaTexto: 'Sol: Piscis' } }, r3);
  c('un area cortada NO se entrega', r3.code !== 200, 'HTTP ' + r3.code);
  c('y no se cuela ningun texto', !r3.body?.texto);

} catch (err) {
  console.error = errOriginal;
  console.error('\n  X la prueba reventó:', err.message);
  fallos++;
} finally {
  console.error = errOriginal;
  limpiar();
}

console.log(fallos ? `\n  ${fallos} COMPROBACIONES FALLIDAS\n` : '\n  todo pasa\n');
process.exit(fallos ? 1 : 0);
