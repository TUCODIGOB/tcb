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
  ['el tope de cada area',          'const TOPE_DE_UN_AREA = 90000'],
  ['el tope de sacar los rasgos',  'const TOPE_DE_SACAR = 100000'],
  ['el tope de escribir',          'const TOPE_DE_ESCRIBIR = 110000'],
  ['el tope de elegir',            'const TOPE_DE_ELEGIR = 40000'],
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
    .replace("import Stripe from 'stripe';", "import Stripe from './.stripe-falso.mjs';")
    .replace('const TOPE_DE_LA_PETICION = 285000', `const TOPE_DE_LA_PETICION = ${presupuesto}`)
    .replace('const TOPE_DE_SACAR = 100000', 'const TOPE_DE_SACAR = 2000')
    .replace('const TOPE_DE_ESCRIBIR = 110000', 'const TOPE_DE_ESCRIBIR = 2500')
    .replace('const TOPE_DE_ELEGIR = 40000', 'const TOPE_DE_ELEGIR = 1500')
    .replace('const TOPE_DE_UN_AREA = 90000', 'const TOPE_DE_UN_AREA = 2500')
    .replace('const LO_QUE_TARDA_OTRA_TIRADA = 180000', 'const LO_QUE_TARDA_OTRA_TIRADA = 8000')
    
}

const stripeFalsoRuta = path.join(AQUI, '.stripe-falso.mjs');
const rutaA = path.join(AQUI, '.chat-colgada.mjs');
const rutaB = path.join(AQUI, '.chat-sin-tiempo.mjs');
fs.writeFileSync(stripeFalsoRuta, STRIPE_FALSO);
fs.writeFileSync(rutaA, aEscala(original, 20000));   // da de sobra: cabe el reintento
fs.writeFileSync(rutaB, aEscala(original, 5000));    // apurado: no cabe nada opcional

process.env.STRIPE_SECRET_KEY = 'sk_test';
process.env.ANTHROPIC_API_KEY = 'sk-ant-test';
process.env.BREVO_API_KEY = '';

// ── 3. El modelo de mentira.
// Cada rasgo con su titulo, distintos entre si: dos titulos que dicen lo mismo
// los quita el filtro de repetidos y el area se quedaria coja.
const TITULOS = {
  Fortaleza: [
    'Aguantas cuando todo aprieta', 'Miras de frente lo incomodo',
    'Decides rapido y sin ruido', 'Cuidas los detalles pequenos',
    'Sostienes a quien se cae', 'Aprendes de cada golpe',
    'Hablas claro sin herir a nadie', 'Guardas la calma en la tormenta',
    'Empujas los proyectos hasta el final', 'Notas lo que nadie dice',
    'Repartes tu tiempo con cabeza', 'Levantas el animo de tu gente',
    'Ahorras pensando en manana', 'Negocias sin perder la forma',
  ],
  Desafio: [
    'Te callas lo que te duele', 'Aplazas las conversaciones dificiles',
    'Cargas con lo que no te toca', 'Dudas de lo que ya sabes',
    'Buscas aprobacion antes de moverte', 'Te exiges mas de la cuenta',
    'Huyes del conflicto abierto', 'Escondes lo que necesitas',
    'Controlas hasta lo que no depende de ti', 'Postergas los cierres',
    'Te comparas con quien no deberias', 'Gastas energia en agradar',
    'Temes quedarte sin nada', 'Confundes ayudar con salvar',
  ],
};
const rasgoDe = (origen, i, lista) => ({
  nombre: TITULOS[lista][i], descripcion: 'Sigues de pie donde otros se bajan.',
  causa: 'Sostienes el esfuerzo sin depender de que salga bien.', origen,
});
// Ahora los rasgos van en dos pasos: uno elige -nombre, area y de donde sale- y
// otro escribe la descripcion y la causa de cada uno. Aqui se contesta a los
// dos, cada uno con lo suyo.
const POR_AREAS = [
  ['IDENTIDAD',  'Sol en Aries casa 1',        'Ascendente en Aries'],
  ['PATRONES',   'Nodo Norte en Acuario',      'casa 9 en Aries'],
  ['MIEDOS',     'Saturno en Acuario casa 12', 'Neptuno en Acuario'],
  ['HERIDA',     'Luna en Aries casa 4',       'Quiron en Acuario'],
  ['AMOR',       'Venus en Acuario',           'casa 5 en Aries'],
  ['RELACIONES', 'Mercurio en Aries',          'casa 11 en Acuario'],
  ['DINERO',     'casa 2 en Aries',            'casa 10 en Acuario'],
];
// Ahora los rasgos van en tres pasos: uno los saca, cuatro los escriben y otro
// elige. Aqui se contesta a los tres, cada uno con lo suyo.
const losSacados = JSON.stringify({
  rasgos: POR_AREAS.flatMap(([area, a, b], k) => [
    { lista: 'fortalezas', nombre: TITULOS.Fortaleza[k * 2],     origen: a },
    { lista: 'fortalezas', nombre: TITULOS.Fortaleza[k * 2 + 1], origen: b },
    { lista: 'desafios',   nombre: TITULOS.Desafio[k * 2],       origen: a },
    { lista: 'desafios',   nombre: TITULOS.Desafio[k * 2 + 1],   origen: b },
  ]),
});
// El que escribe devuelve un texto por rasgo, con su nombre delante.
const losTextos = cuerpo => JSON.stringify({
  textos: (String(cuerpo.system || '').match(/^\d+\. (.+)$/gm) || [])
    .map(l => l.replace(/^\d+\. /, ''))
    .map(nombre => ({ nombre,
      descripcion: 'Sigues de pie donde otros se bajan del todo, y la gente que tienes cerca ya cuenta con eso sin decirlo.',
      causa: 'Sostienes el esfuerzo sin depender de que salga bien.' })),
});
// El que elige devuelve numero y area: aqui se queda con todos, repartidos por
// las siete areas, y el techo lo recorta el codigo despues.
const losElegidos = cuantos => JSON.stringify({
  elegidos: Array.from({ length: cuantos }, (_, i) => ({ numero: i + 1, area: POR_AREAS[i % 7][0] })),
});
const cuantosHay = cuerpo => (String(cuerpo.system || '').match(/^\d+\. \[/gm) || []).length;

let llamadas = 0, sinSenal = 0, colgarLaPrimera = false, yaColgada = false;

globalThis.fetch = async (url, opciones) => {
  const u = String(url);
  if (!u.includes('api.anthropic.com')) return { ok: true, status: 200, json: async () => ({}) };

  llamadas++;
  if (!opciones || !opciones.signal) sinSenal++;

  let esElegir = false, esEscribir = false, esSacar = false, cuantos = 0, cuerpoVisto = {};
  try {
    const cuerpo = JSON.parse(opciones.body);
    const sistema = String(cuerpo.system || '');
    esElegir = sistema.includes('AQUÍ NO SE ESCRIBE NADA');
      esSacar = sistema.includes('AQUÍ NO SE ESCRIBE EL INFORME');
    esEscribir = sistema.includes('AQUÍ NO SE ELIGE NADA');
    if (esElegir) cuantos = cuantosHay(cuerpo);
      cuerpoVisto = cuerpo;
  } catch (e) {}
  const esLista = esElegir || esEscribir;

  // LA LLAMADA QUE NO CONTESTA. Solo termina si la cortan: si el codigo no le
  // pone senal, esta promesa no se resuelve jamas y la prueba se cuelga, igual
  // que se colgo la funcion en produccion.
  if (colgarLaPrimera && esEscribir && !yaColgada) {
    yaColgada = true;
    await new Promise((_, rechazar) => {
      if (!opciones.signal) return;
      opciones.signal.addEventListener('abort', () => rechazar(opciones.signal.reason), { once: true });
    });
  }

  await espera(120);
  // Las que razonan traen delante un bloque de pensamiento y detras el texto,
  // como hace la API de verdad. Las demas contestan con un bloque solo.
  if (esSacar) {
    return { ok: true, status: 200, json: async () => ({ content: [
      { type: 'thinking', thinking: '' },
      { type: 'text', text: losSacados },
    ] }) };
  }
  if (esElegir) {
    return { ok: true, status: 200, json: async () => ({ content: [
      { type: 'thinking', thinking: '' },
      { type: 'text', text: losElegidos(cuantos) },
    ] }) };
  }
  if (esEscribir) {
    return { ok: true, status: 200, json: async () => ({ content: [
      { type: 'text', text: losTextos(cuerpoVisto) },
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
  // Si una de las que escriben se cuelga, se vuelve a pedir la tirada entera:
  // 1 + 4 colgada + 1 + 4 buenas + la que elige + las 7 areas.
  comprobar('la colgada se corta y se vuelve a pedir',
    llamadas === 18, `${llamadas} llamadas (1+4 + 1+4+1 + 7)`);
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
  comprobar('no se pide ni una llamada de mas por ir justo de tiempo', llamadas === 13,
    `${llamadas} llamadas (sacar + 4 de escribir + elegir + 7 areas)`);
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
