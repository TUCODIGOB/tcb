// ═════════════════════════════════════════════════════════════════
// test/chat-llamada-colgada.test.mjs
//
// Lo que se rompio en el informe 116: una llamada al modelo se quedo 189
// segundos sin contestar, no llevaba tope de tiempo, no fallaba nunca, el
// reintento no llegaba a saltar y Vercel mato la funcion a los 300 segundos.
// El cliente pago y no tuvo informe.
//
// Aqui se comprueban las dos cosas que lo arreglan:
//
//   A) una llamada colgada se corta sola y se vuelve a pedir, y el informe
//      sale igual;
//   B) cuando ya no queda tiempo, los pasos que solo pulen se saltan —
//      MENOS llamadas, no mas — y el informe sale igual.
//
// El fetch de mentira de la prueba A no contesta NUNCA si no le llega una
// senal de aborto: sin el arreglo, esta prueba se queda colgada, que es
// exactamente lo que le paso al cliente.
//
// Ejecutar:  node test/chat-llamada-colgada.test.mjs
// Sin red y sin Stripe. No toca ningun fichero de produccion.
// ═════════════════════════════════════════════════════════════════

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.join(AQUI, '..');
const espera = ms => new Promise(r => setTimeout(r, ms));
const SEPARADOR = String.fromCharCode(31);

let fallos = 0;
const comprobar = (desc, ok, detalle = '') => {
  console.log(`  ${ok ? '✔' : '✘ FALLA'}  ${desc}${detalle ? '  [' + detalle + ']' : ''}`);
  if (!ok) fallos++;
};

const original = fs.readFileSync(path.join(RAIZ, 'api', 'chat.js'), 'utf8');

// ── 1. Primero se comprueba que en produccion los topes son los de verdad.
//    La prueba los baja despues para no tardar cinco minutos, asi que si
//    alguien los quita del codigo, esto salta antes de bajar nada.
const ENPRODUCCION = [
  ['el presupuesto de la peticion', 'const TOPE_DE_LA_PETICION = 285000'],
  ['el tope de cada area',          'signal: reloj.senal(90000)'],
  ['el tope de buscar',            'const TOPE_DE_ELEGIR = 100000'],
  ['el tope de limpiar',           'const TOPE_DE_LIMPIAR = 90000'],
  ['el tope de escribir',          'const TOPE_DE_ESCRIBIR = 90000'],
];
console.log('\n  api/chat.js — una llamada colgada ya no se lleva el informe por delante\n');
for (const [que, texto] of ENPRODUCCION) {
  comprobar(`sigue puesto ${que}`, original.includes(texto), texto);
}
if (fallos) { console.log(`\n  ${fallos} COMPROBACIONES FALLIDAS\n`); process.exit(1); }

// ── 2. Stripe de mentira y copias del fichero real con los tiempos a escala.
const TIENDA = new Map();
globalThis.__TIENDA = TIENDA;
const STRIPE_FALSO = `
export default function Stripe() {
  return { checkout: { sessions: {
    async retrieve(id) {
      await new Promise(r => setTimeout(r, 20));
      const s = globalThis.__TIENDA.get(id);
      return s ? JSON.parse(JSON.stringify(s)) : null;
    },
    async update(id, { metadata }) {
      await new Promise(r => setTimeout(r, 30));
      const s = globalThis.__TIENDA.get(id);
      s.metadata = {};
      for (const [k, v] of Object.entries(metadata)) {
        if (v !== '' && v != null) s.metadata[k] = String(v);
      }
      return JSON.parse(JSON.stringify(s));
    },
  } } };
}`;

// Los mismos segundos, divididos. Lo que se prueba es el comportamiento, no
// el numero: que la colgada se corte y que lo opcional se caiga sin tiempo.
function aEscala(texto, presupuesto) {
  return texto
    .replace("import Stripe from 'stripe';", "import Stripe from './.stripe-falso-colgada.mjs';")
    .replace('const TOPE_DE_LA_PETICION = 285000', `const TOPE_DE_LA_PETICION = ${presupuesto}`)
    .replace('const TOPE_DE_ELEGIR = 100000', 'const TOPE_DE_ELEGIR = 2000')
    .replace('const TOPE_DE_LIMPIAR = 90000', 'const TOPE_DE_LIMPIAR = 2000')
    .replace('reloj.senal(90000)', 'reloj.senal(2500)')
    .replace('hayTiempoPara(180)', 'hayTiempoPara(5)')
    .replace('const TOPE_DE_ESCRIBIR = 90000', 'const TOPE_DE_ESCRIBIR = 2000')
    .replace('hayTiempoPara(120)', 'hayTiempoPara(3)')
    .replace('hayTiempoPara(100)', 'hayTiempoPara(3)');
}

const stripeFalsoRuta = path.join(AQUI, '.stripe-falso-colgada.mjs');
const rutaA = path.join(AQUI, '.chat-colgada.mjs');
const rutaB = path.join(AQUI, '.chat-sin-tiempo.mjs');
fs.writeFileSync(stripeFalsoRuta, STRIPE_FALSO);
fs.writeFileSync(rutaA, aEscala(original, 12000));   // da de sobra: cabe el reintento
fs.writeFileSync(rutaB, aEscala(original, 2500));    // apurado: no cabe nada opcional

process.env.STRIPE_SECRET_KEY = 'sk_test';
process.env.ANTHROPIC_API_KEY = 'sk-ant-test';
process.env.BREVO_API_KEY = '';

// ── 3. El modelo de mentira.
// Cada rasgo con su conducta, todas distintas entre si, como en una lista de
// verdad.
const CONDUCTAS = {
  fortalezas: [
    'Aguantas cuando todo aprieta', 'Miras de frente lo incomodo',
    'Decides rapido y sin ruido', 'Cuidas los detalles pequenos',
    'Sostienes a quien se cae', 'Aprendes de cada golpe',
    'Hablas claro sin herir a nadie', 'Guardas la calma en la tormenta',
    'Empujas los proyectos hasta el final', 'Notas lo que nadie dice',
    'Repartes tu tiempo con cabeza', 'Levantas el animo de tu gente',
    'Ahorras pensando en manana', 'Negocias sin perder la forma',
  ],
  desafios: [
    'Te callas lo que te duele', 'Aplazas las conversaciones dificiles',
    'Cargas con lo que no te toca', 'Dudas de lo que ya sabes',
    'Buscas aprobacion antes de moverte', 'Te exiges mas de la cuenta',
    'Huyes del conflicto abierto', 'Escondes lo que necesitas',
    'Controlas hasta lo que no depende de ti', 'Postergas los cierres',
    'Te comparas con quien no deberias', 'Gastas energia en agradar',
    'Temes quedarte sin nada', 'Confundes ayudar con salvar',
    'Te adelantas a lo que quiere el otro', 'Alargas lo que ya no te sirve',
    'Empiezas mil cosas y no cierras ninguna', 'Te disculpas sin motivo',
    'Rebajas tu precio antes de que te lo pidan', 'Evitas mirar los numeros',
    'Te cierras cuando algo te duele',
  ],
};

// Las posiciones son inventadas para la prueba, de nadie: solo tienen que caer
// en el area de su caja para que el codigo las acepte. Van tres por area, que
// es lo que pide la lista mas larga.
const POR_AREAS = [
  ['IDENTIDAD',  ['Sol en Aries casa 1', 'Ascendente en Aries', 'casa 1 en Aries']],
  ['PATRONES',   ['Nodo Norte en Acuario', 'casa 9 en Aries', 'casa 6 en Aries']],
  ['MIEDOS',     ['Saturno en Acuario casa 12', 'Neptuno en Acuario', 'casa 12 en Acuario']],
  ['HERIDA',     ['Luna en Aries casa 4', 'Quiron en Acuario', 'casa 4 en Aries']],
  ['AMOR',       ['Venus en Acuario', 'casa 5 en Aries', 'casa 7 en Aries']],
  ['RELACIONES', ['Mercurio en Aries', 'casa 11 en Acuario', 'casa 3 en Aries']],
  ['DINERO',     ['casa 2 en Aries', 'casa 10 en Acuario', 'casa 8 en Aries']],
];

// PASO 1, BUSCAR: cada llamada saca SU lista, con las cinco casillas llenas.
// Dos fortalezas por area y tres desafios, que es lo que pide el encargo.
// UNA SOLA RESPUESTA CON LAS DOS LISTAS DENTRO, y cada rasgo diciendo cual de
// las dos cosas es, que es como contesta ahora el paso 1.
const losRasgos = () => JSON.stringify({
  rasgos: POR_AREAS.flatMap(([area, posiciones], k) =>
    ['fortalezas', 'desafios'].flatMap(cual => {
      const cuantos = cual === 'fortalezas' ? 2 : 3;
      return posiciones.slice(0, cuantos).map((origen, i) => ({
        lista: cual,
        area,
        conducta: CONDUCTAS[cual][k * cuantos + i],
        origen,
      }));
    })),
});

// PASO 3, ESCRIBIR: le llega media lista numerada y devuelve, por cada numero,
// el titulo, la descripcion y la causa.
const loEscrito = sistema => {
  const cuantos = (sistema.match(/^\d+\. /gm) || []).length;
  return JSON.stringify({
    rasgos: Array.from({ length: cuantos }, (_, i) => ({
      n: i + 1,
      titulo: `Titulo del rasgo numero ${i + 1}`,
      descripcion: 'Sigues de pie donde otros se bajan del todo, y quien te tiene cerca ya cuenta con eso.',
      causa: 'Sostienes el esfuerzo sin depender de que salga bien.',
    })),
  });
};

// PASO 2, LIMPIAR: contesta solo con numeros. Se queda con todos a proposito,
// para que lo que se cuenta aqui sean las llamadas y no lo que quite.
const laLimpieza = sistema => {
  const cuantos = (sistema.match(/^\d+\. /gm) || []).length;
  return JSON.stringify({
    sequedan: Array.from({ length: cuantos }, (_, i) => i + 1), sequitan: [],
  });
};

let llamadas = 0, sinSenal = 0, colgarLaPrimera = false, yaColgada = false, yaColgadaEscribir = false;

globalThis.fetch = async (url, opciones) => {
  const u = String(url);
  if (!u.includes('api.anthropic.com')) return { ok: true, status: 200, json: async () => ({}) };

  llamadas++;
  if (!opciones || !opciones.signal) sinSenal++;

  let esBuscar = false, esLimpiar = false, esEscribir = false, sistema = '';
  try {
    const cuerpo = JSON.parse(opciones.body);
    sistema = String(cuerpo.system || '');
    esBuscar = sistema.includes('AQUÍ SOLO SE BUSCAN, NO SE ESCRIBEN');
    esLimpiar = sistema.includes('Abajo tienes las fortalezas y los desafíos');
    esEscribir = sistema.includes('AQUÍ NO SE ELIGE NADA');
  } catch (e) {}

  // LA LLAMADA QUE NO CONTESTA. Solo termina si la cortan: si el codigo no le
  // pone senal, esta promesa no se resuelve jamas y la prueba se cuelga, igual
  // que se colgo la funcion en produccion.
  if (colgarLaPrimera && ((esBuscar && !yaColgada) || (esEscribir && !yaColgadaEscribir))) {
    if (esBuscar) yaColgada = true; else yaColgadaEscribir = true;
    await new Promise((_, rechazar) => {
      if (!opciones.signal) return;
      opciones.signal.addEventListener('abort', () => rechazar(opciones.signal.reason), { once: true });
    });
  }

  await espera(120);
  // Buscar y limpiar razonan, asi que su respuesta trae delante un bloque de
  // pensamiento y detras el texto, como hace la API de verdad. Las areas no
  // razonan y contestan con un bloque solo.
  if (esBuscar) {
    return { ok: true, status: 200, json: async () => ({ content: [
      { type: 'thinking', thinking: '' },
      { type: 'text', text: losRasgos() },
    ] }) };
  }
  if (esLimpiar) {
    return { ok: true, status: 200, json: async () => ({ content: [
      { type: 'thinking', thinking: '' },
      { type: 'text', text: laLimpieza(sistema) },
    ] }) };
  }
  if (esEscribir) {
    return { ok: true, status: 200, json: async () => ({ content: [
      { type: 'thinking', thinking: '' },
      { type: 'text', text: loEscrito(sistema) },
    ] }) };
  }
  return { ok: true, status: 200, json: async () => ({ content: [
    { type: 'text', text: 'Texto de area generado para la prueba. '.repeat(10) },
  ] }) };
};

const respuesta = () => {
  const r = { code: 0, body: null };
  r.status = c => { r.code = c; return r; };
  r.json = b => { r.body = b; return r; };
  r.setHeader = () => {};
  return r;
};
const pedir = (chat, sid) => {
  const r = respuesta();
  TIENDA.set(sid, {
    id: sid, payment_status: 'paid', customer_email: 'cliente@ejemplo.com',
    customer_details: { email: 'cliente@ejemplo.com' }, metadata: { nombre: 'Ana Ruiz' },
  });
  return chat({ method: 'POST', body: { session_id: sid, nombre: 'Ana Ruiz',
    cartaTexto: '- Sol: Aries (casa 1)\n- Saturno: Acuario (casa 12)\n- Marte: Aries (casa 1)' } }, r)
    .then(() => r);
};

const limpiar = () => { for (const f of [stripeFalsoRuta, rutaA, rutaB]) try { fs.unlinkSync(f); } catch {} };

try {
  // ── A) Una lista se queda colgada. Tiene que cortarse y volver a pedirse.
  colgarLaPrimera = true;
  const { default: chatA } = await import(rutaA);
  const empieza = Date.now();
  const a = await Promise.race([
    pedir(chatA, 'cs_test_colgada'),
    espera(25000).then(() => ({ code: 0, colgado: true })),
  ]);
  const tardo = Date.now() - empieza;

  comprobar('la peticion no se queda colgada', !a.colgado, `${(tardo / 1000).toFixed(1)}s`);
  comprobar('el informe sale igual', a.code === 200, 'HTTP ' + a.code);
  comprobar('la colgada se corta y se vuelve a pedir esa sola',
    llamadas === 14, `${llamadas} llamadas (12 + las dos que se cortaron)`);
  comprobar('ninguna llamada al modelo va sin tope de tiempo', sinSenal === 0,
    `${sinSenal} sin tope`);

  // ── B) Sin tiempo, lo que solo pule se cae. Menos llamadas, no mas.
  colgarLaPrimera = false;
  llamadas = 0;
  const { default: chatB } = await import(rutaB);
  const b = await Promise.race([
    pedir(chatB, 'cs_test_sin_tiempo'),
    espera(25000).then(() => ({ code: 0, colgado: true })),
  ]);

  comprobar('con el tiempo justo el informe tambien sale', b.code === 200 && !b.colgado, 'HTTP ' + b.code);
  comprobar('no se pide ni una llamada de mas por ir justo de tiempo', llamadas === 11,
    `${llamadas} llamadas (buscar + limpiar + 2 de escribir + 7 areas, sin el repaso)`);
  comprobar('el informe llega entero al cliente, con sus siete areas',
    typeof b.body?.texto === 'string' && b.body.texto.split(SEPARADOR).length === 7,
    (b.body?.texto ? b.body.texto.split(SEPARADOR).length : 0) + ' areas');

} catch (err) {
  console.error('\n  ✘ la prueba reventó:', err.message);
  fallos++;
} finally {
  limpiar();
}

console.log(fallos ? `\n  ${fallos} COMPROBACIONES FALLIDAS\n` : '\n  todo pasa\n');
process.exit(fallos ? 1 : 0);
