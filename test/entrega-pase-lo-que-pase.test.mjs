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

// El area que devuelve el modelo: entera, bien escrita, PERO sin escena.
// Es el caso que antes tiraba el informe.
const SIN_ESCENA = [
  'Te levantas y ya has repasado la lista entera antes de poner los pies en el suelo, y eso lo haces desde hace tanto que ya ni lo notas.',
  '',
  'Y mientras asientes por fuera, por dentro **estas calculando cuanto has ensenado de mas**, Ana, que es un trabajo que no descansa nunca.',
  '',
  '[SUBTITULO] La cuenta que no llevas',
  'De ahi sale todo lo demas, que es lo que nadie te ha contado y llevas media vida pagando sin enterarte de que lo pagabas.',
  '',
  '[SUBTITULO] Donde empezo esto',
  'Eso no se arregla apretando mas, se arregla mirando de donde viene, y viene de mucho antes de que tuvieras nada que demostrar.',
  '',
  '[REMATE] Llevas media vida pidiendo permiso para ocupar tu propio sitio',
  '',
  'Y aun asi sigues de pie, que es lo que nadie te reconoce nunca ni siquiera cuando se apoyan en ti.',
  '',
  '[PREGUNTA] ¿Cuantas veces te has callado algo por no montar un lio?',
  '',
  'Y hasta que no veas eso, vas a seguir buscando fuera lo que llevas anos pudiendo darte tu sola.',
].join('\n');

// Se cambia entre las dos escenas de prueba: el modelo que nunca pone la
// escena, y el que devuelve el area cortada a media frase.
// La misma area pero CON su escena: un informe que sale bien.
const AREA_BUENA = SIN_ESCENA.replace(
  '[SUBTITULO] Donde empezo esto',
  '[ESCENA] Son las once de la noche y sigues con el movil en la mano sin mirar nada.\n\n[SUBTITULO] Donde empezo esto');

let modo = 'sin escena';
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
    if (modo === 'buena') {
      return { ok: true, status: 200, json: async () => ({ content: [{ text: AREA_BUENA }] }) };
    }
    if (modo === 'cortada') {
      return { ok: true, status: 200, json: async () => ({
        stop_reason: 'max_tokens',
        content: [{ text: SIN_ESCENA.slice(0, 900) + ' y entonces tu' }],
      }) };
    }
    return { ok: true, status: 200, json: async () => ({ content: [{ text: SIN_ESCENA }] }) };
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

  console.log('\n  el modelo no pone la escena NUNCA, ni al repasar\n');
  const r = res();
  await chat({ method: 'POST', body: { session_id: SID, nombre: 'Ana Ruiz', cartaTexto: 'Sol: Piscis' } }, r);

  c('el informe se entrega igual', r.code === 200, 'HTTP ' + r.code);
  c('llega el texto de las siete areas', typeof r.body?.texto === 'string' && r.body.texto.length > 3000,
    (r.body?.texto || '').length + ' caracteres');
  c('y grita en los registros', gritos.some(g => g.includes('ENTREGADA SIN ARREGLAR')),
    gritos.filter(g => g.includes('ENTREGADA')).length + ' avisos');
  c('el aviso dice que falta la escena', gritos.some(g => g.includes('falta la escena')));
  c('manda UN correo, no uno por area', correos.length === 1, correos.length + ' correos');
  c('el correo dice que el informe SI se entrego',
    JSON.stringify(correos[0] || {}).includes('SE HA ENTREGADO'));
  c('y lista las siete areas cojas', (() => {
    const cuerpo = (correos[0]?.htmlContent || '') + (correos[0]?.subject || '');
    return (cuerpo.match(/rea \d+:/g) || []).length === 7;
  })(), ((correos[0]?.htmlContent || '').match(/rea \d+:/g) || []).length + ' areas listadas');

  // ── Y AHORA LO CONTRARIO ──────────────────────────────────────────
  // Un area que llega cortada a media frase no es una marca que falta: es
  // texto que no existe. Eso NO se entrega nunca, y el cliente ve la
  // pantalla de reintentar con su intento intacto.
  console.log('\n  el modelo devuelve el area cortada a media frase\n');
  modo = 'cortada';
  gritos.length = 0;
  const SID2 = 'cs_test_cortada';
  TIENDA.set(SID2, {
    id: SID2, payment_status: 'paid', customer_email: 'cliente@ejemplo.com',
    customer_details: { email: 'cliente@ejemplo.com' }, metadata: { nombre: 'Ana Ruiz' },
  });
  const r2 = res();
  await chat({ method: 'POST', body: { session_id: SID2, nombre: 'Ana Ruiz', cartaTexto: 'Sol: Piscis' } }, r2);
  c('un area cortada NO se entrega', r2.code !== 200, 'HTTP ' + r2.code);
  c('y no se cuela ningun texto', !r2.body?.texto, r2.body?.texto ? 'llego texto' : 'sin texto');

  // ── Y si el correo revienta, el informe sale igual ────────────────
  // El aviso es para enterarse, no para bloquear una venta: si Brevo esta
  // caido, el cliente tiene que recibir su informe de todas formas.
  console.log('\\n  el correo de aviso revienta\\n');
  modo = 'sin escena';
  correoRevienta = true;
  const SID3 = 'cs_test_correo';
  TIENDA.set(SID3, {
    id: SID3, payment_status: 'paid', customer_email: 'cliente@ejemplo.com',
    customer_details: { email: 'cliente@ejemplo.com' }, metadata: { nombre: 'Ana Ruiz' },
  });
  const r3 = res();
  await chat({ method: 'POST', body: { session_id: SID3, nombre: 'Ana Ruiz', cartaTexto: 'Sol: Piscis' } }, r3);
  c('con el correo caido, el informe se entrega igual', r3.code === 200, 'HTTP ' + r3.code);

  // ── Y LO MAS IMPORTANTE: si el informe sale BIEN, ni un correo ────
  console.log('\n  el informe sale bien\n');
  modo = 'buena';
  correoRevienta = false;
  correos.length = 0;
  gritos.length = 0;
  const SID4 = 'cs_test_bueno';
  TIENDA.set(SID4, {
    id: SID4, payment_status: 'paid', customer_email: 'cliente@ejemplo.com',
    customer_details: { email: 'cliente@ejemplo.com' }, metadata: { nombre: 'Ana Ruiz' },
  });
  const r4 = res();
  await chat({ method: 'POST', body: { session_id: SID4, nombre: 'Ana Ruiz', cartaTexto: 'Sol: Piscis' } }, r4);
  c('el informe sale', r4.code === 200, 'HTTP ' + r4.code);
  c('y NO llega ningun correo', correos.length === 0, correos.length + ' correos');
  c('ni ningun grito de area coja', !gritos.some(g => g.includes('ENTREGADA SIN ARREGLAR')));
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
