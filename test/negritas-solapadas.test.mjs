// ═════════════════════════════════════════════════════════════════
// test/negritas-solapadas.test.mjs
//
// Cuando al area le faltan negritas, chat.js pide al modelo SOLO las
// frases a resaltar y los asteriscos los pone el codigo. El modelo ve
// los parrafos tal cual, con las negritas que ya traian dentro, asi que
// puede devolver una frase que SE PISA con una que ya estaba marcada.
//
// Marcandola igual, los asteriscos quedaban unos dentro de otros:
//
//   **por dentro **llevas una maquina** de repasar**
//
// y al maquetar eso sale partido en dos trozos resaltados con texto
// normal en medio, justo donde iba la frase que mas importaba. No ha
// llegado a salir en ningun informe, pero el modelo puede devolverlas
// asi cualquier dia.
//
// Aqui se le hace devolver una que se pisa a proposito y se comprueba
// que la negrita que ya estaba sigue entera y que el area se entrega.
//
// Ejecutar:  node test/negritas-solapadas.test.mjs
// Sin red y sin Stripe.
// ═════════════════════════════════════════════════════════════════

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.join(AQUI, '..');
const SID = 'cs_test_solape';
const SEPARADOR_AREAS = '';

// La negrita que el modelo ya trae escrita en el segundo parrafo. Es la que
// tiene que seguir entera al final: es la comprobacion de toda la prueba.
const YA_MARCADA = 'llevas una maquina que no para de repasar';

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
}
`;

const AREA = JSON.stringify({
  parrafos: [
    { ladillo: null, texto: 'Antes de contarte nada de ti, quiero que pienses un momento en las personas que sostienen, porque en cualquier familia hay una y casi nadie le pregunta como lo lleva.' },
    { ladillo: 'La cuenta que no llevas', texto: `Por fuera pareces tranquila, Ana, y por dentro **${YA_MARCADA}** lo que acabas de decir antes de decirlo.` },
    { ladillo: null, texto: 'En el trabajo se te nota enseguida, revisas una tarea tres veces cuando con una bastaria, y no es que dudes de tu criterio, es otra cosa distinta.' },
    { ladillo: 'Donde aprendiste la cuenta', texto: 'De pequena entendiste que el carino se ganaba haciendo las cosas bien, siendo la que no daba problemas nunca y la que sacaba todo adelante.' },
    { ladillo: null, texto: 'Y cuarenta anos despues sigues revisando y sigues anticipando, sin que nadie te lo haya pedido jamas y sin llevar tu la cuenta de lo que cuesta.' },
  ],
  escena: { tras_parrafo: 2, texto: 'Son las once de la noche y sigues con el movil en la mano sin mirar nada en concreto.' },
  remate_herida: { tras_parrafo: 4, texto: 'Te has pasado la vida demostrando que se puede confiar en ti' },
  remate_fuerza: { tras_parrafo: 5, texto: 'Muy poca gente sigue sosteniendo cuando ya no la mira nadie' },
  pregunta: { tras_parrafo: 3, texto: '¿Cuando fue la ultima vez que alguien te dio las gracias por eso?' },
  cierre: 'No estas cansada de hacer cosas, estas cansada de que sea la unica prueba que te vale.',
});

globalThis.fetch = async (url, opts = {}) => {
  const u = String(url);
  if (!u.includes('api.anthropic.com')) return { ok: true, status: 201, json: async () => ({}) };
  const cuerpo = JSON.parse(opts.body || '{}');
  if (cuerpo.max_tokens === 1) return { ok: true, status: 200, json: async () => ({ content: [{ text: 'ok' }] }) };

  const sis = typeof cuerpo.system === 'string' ? cuerpo.system : (cuerpo.system?.[0]?.text || '');
  if (sis.startsWith('Eres un corrector de estilo')) {
    return { ok: true, status: 200, json: async () => ({ content: [{ text: '{"frases":[]}' }] }) };
  }
  // EL MAQUETADOR. Devuelve tres frases, y la primera SE PISA a proposito con
  // la negrita que ya estaba puesta: empieza antes y termina dentro de ella.
  if (sis.startsWith('Eres un maquetador')) {
    return { ok: true, status: 200, json: async () => ({ content: [{ text: JSON.stringify({ frases: [
      'por dentro **llevas una maquina',
      'revisas una tarea tres veces',
      'siendo la que no daba problemas nunca',
    ] }) }] }) };
  }
  return { ok: true, status: 200, json: async () => ({ content: [{ text: AREA }] }) };
};

process.env.STRIPE_SECRET_KEY = 'sk_test';
process.env.ANTHROPIC_API_KEY = 'sk-ant-test';
process.env.BREVO_API_KEY = '';

const stripeFalsoRuta = path.join(AQUI, '.stripe-falso-solape.mjs');
const chatRuta = path.join(AQUI, '.chat-solape.mjs');
const original = fs.readFileSync(path.join(RAIZ, 'api', 'chat.js'), 'utf8');
const MARCA = "import Stripe from 'stripe';";
if (!original.includes(MARCA)) {
  console.error('X api/chat.js ya no importa Stripe como se esperaba.');
  process.exit(1);
}
fs.writeFileSync(stripeFalsoRuta, STRIPE_FALSO);
fs.writeFileSync(chatRuta, original.replace(MARCA, "import Stripe from './.stripe-falso-solape.mjs';"));
const limpiar = () => { for (const f of [stripeFalsoRuta, chatRuta]) try { fs.unlinkSync(f); } catch {} };

let fallos = 0;
const c = (d, ok, det = '') => {
  console.log(`  ${ok ? 'ok  ' : 'FALLA'} ${d}${det ? '  [' + det + ']' : ''}`);
  if (!ok) fallos++;
};

const warnOriginal = console.warn;
console.warn = () => {};

try {
  const { default: chat } = await import(chatRuta);
  const r = { code: 0, body: null };
  r.status = x => { r.code = x; return r; };
  r.json = b => { r.body = b; return r; };
  r.setHeader = () => {};

  TIENDA.set(SID, {
    id: SID, payment_status: 'paid', customer_email: 'c@e.com',
    customer_details: { email: 'c@e.com' }, metadata: { nombre: 'Ana Ruiz' },
  });

  console.log('\n  el maquetador devuelve una frase que se pisa con una negrita que ya estaba\n');
  await chat({ method: 'POST', body: { session_id: SID, nombre: 'Ana Ruiz', cartaTexto: 'Sol: Piscis' } }, r);
  const texto = r.body?.texto || '';
  const areas = texto.split(SEPARADOR_AREAS);
  const negritasDe = t => (t.match(/\*\*[\s\S]+?\*\*/g) || []).length;

  c('el informe se entrega', r.code === 200, 'HTTP ' + r.code);
  c('LA NEGRITA QUE YA ESTABA SIGUE ENTERA',
    texto.includes('**' + YA_MARCADA + '**'),
    texto.includes('**' + YA_MARCADA + '**') ? '' : 'se ha partido en dos');
  c('las que NO se pisan si se han marcado',
    texto.includes('**revisas una tarea tres veces**') &&
    texto.includes('**siendo la que no daba problemas nunca**'));
  c('cada area llega al minimo de tres negritas',
    areas.length === 7 && areas.every(a => negritasDe(a) >= 3),
    areas.map(negritasDe).join(','));
  c('y ningun asterisco se queda suelto',
    texto.split('\n\n').every(t => ((t.match(/\*\*/g) || []).length % 2) === 0));
} catch (err) {
  console.warn = warnOriginal;
  console.error('\n  X la prueba reventó:', err.message);
  fallos++;
} finally {
  console.warn = warnOriginal;
  limpiar();
}

console.log(fallos ? `\n  ${fallos} COMPROBACIONES FALLIDAS\n` : '\n  todo pasa\n');
process.exit(fallos ? 1 : 0);
