// ═════════════════════════════════════════════════════════════════
// test/corrector-no-reescribe.test.mjs
//
// EL CORRECTOR QUE LEIA SE QUITO. LO QUE CAZA POR PALABRAS SE QUEDA.
//
// Habia un repaso que leia cada area con OTRA llamada al modelo buscando
// frases que hablaran de ella desde fuera. Siete llamadas por informe.
//
// Primero mandaba reescribir, y el 24 de agosto mando CUATRO areas de siete:
// las cuatro volvieron marcadas por lo mismo. Cuatro areas de mil trescientas
// palabras pagadas dos veces para quedarnos igual. Cero de cuatro.
//
// Entonces se bajo a aviso. Pero en el informe del 25 marco seis frases y
// CUATRO estaban bien escritas, "Tu no tienes ese problema, Raquel" entre
// ellas, que es de tu y lleva su nombre delante. Un aviso que se equivoca
// cuatro de cada seis veces entierra el de verdad, y ademas nunca cambiaba el
// informe: solo escribia en el registro. Asi que el 26 de agosto se quito.
//
// Lo que se queda es el "ella + verbo", que no es una opinion: es una palabra
// que esta o no esta.
//
// Lo que se comprueba aqui:
//   1. sin nada que marcar, siete areas son siete llamadas
//   2. el corrector que leia NO se llama ni una vez, ni deja apuntes
//   3. el "ella + verbo" que de verdad habla de ella SIGUE haciendo que se
//      vuelva a pedir el area
//   4. pero un "ella" que es otra persona, o una cosa, NO cuesta una vuelta
//   5. y lo demas que si se arregla volviendo a pedir (la escena copiada)
//      sigue funcionando igual
//
// Ejecutar:  node test/corrector-no-reescribe.test.mjs
// No llama a nadie: intercepta fetch.
// ═════════════════════════════════════════════════════════════════

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.join(AQUI, '..');
const SEPARADOR_AREAS = '';

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

// El area se pide con una casilla por bloque: ver ESQUEMA_AREA_POR_BLOQUES en
// api/chat.js. Los cinco bloques llevan algo, que si no el area se rechaza.
const BLOQUES = ['arranque', 'hoy', 'origen', 'creencias', 'soltar'];
const ESCENA = 'Son las once de la noche y todavia estas repasando el movil con la luz apagada, sin mirar nada en concreto.';

// Un area sana: lleva el nombre, tres negritas y sus cinco bloques, para que
// no salte ninguna otra reparacion y lo que se mida sea solo el corrector.
const P = (t) => ({ ladillo: null, texto: t });
function areaCon(extra) {
  const cuerpo = [
    'Hay gente que llega a cualquier sitio y en diez minutos ya sabe quien necesita algo, y tu eres de esas.',
    'Y mientras asientes, Ana, por dentro **estas calculando cuanto has ensenado de mas**, que es un trabajo que no descansa nunca.',
    'De ahi sale todo lo demas, que es lo que nadie te ha contado y **llevas media vida pagando sin enterarte** del precio.',
    '**Eso no se arregla apretando mas**, se arregla mirando de donde viene y quien te enseno a hacerlo asi de pequena.',
    'Y cuando por fin te sientas, la cabeza sigue repasando lo que queda para manana como si alguien lo fuera a corregir.',
  ];
  if (extra) cuerpo.splice(2, 0, extra);
  const a = {
    escena: { tras_bloque: 'hoy', texto: ESCENA },
    remate_herida: { tras_bloque: 'creencias', texto: 'Llevas media vida pidiendo permiso para ocupar tu propio sitio' },
    remate_fuerza: { tras_bloque: 'arranque', texto: 'Nadie aguanta tanto tiempo de pie sin que eso sea una fuerza' },
    pregunta: { tras_bloque: 'origen', texto: '¿Cuantas veces te has callado algo por no montar un lio?' },
    cierre: 'Y hasta que no veas eso, vas a seguir buscando fuera lo que lleva anos esperandote dentro.',
  };
  a.bloques = {};
  cuerpo.forEach((t, i) => {
    const b = BLOQUES[Math.min(i, BLOQUES.length - 1)];
    (a.bloques[b] = a.bloques[b] || []).push(P(t));
  });
  return JSON.stringify(a);
}

// La frase que el corrector marca. Esta en el area de verdad, porque el codigo
// descarta las frases que el corrector se inventa.
const FRASE_MARCADA = 'Hay gente que llega a cualquier sitio y en diez minutos ya sabe quien necesita algo, y tu eres de esas.';
// Y un "ella + verbo" de los que si tienen que costar una vuelta.
// UN "ella + verbo" QUE DE VERDAD HABLA DE ELLA. Sin una sola palabra en
// segunda persona: eso es lo que lo delata, porque una frase que le habla de
// tu no puede estar hablando de ella desde fuera a la vez.
//
// El ejemplo de antes era "Ella responde con un gracias, no se que haria sin
// ti, y se va a seguir con lo suyo". Ese "ella" es la OTRA persona de la
// escena -la clienta es el "ti"- asi que la frase estaba bien y el detector
// la marcaba mal. Es justo el fallo que costo dos areas rehechas en el
// estudio del 25 de agosto.
const CON_ELLA = 'Ella aprendio muy pronto que el carino habia que ganarselo, y ella sigue midiendose con esa vara.';

// Y las dos que el detector marcaba mal en los estudios de verdad, una por
// cada motivo: la primera porque la frase ya le habla de tu, la segunda
// porque el "ella" va detras de preposicion y no es sujeto. Las dos estan
// bien escritas y ninguna puede costar una vuelta.
const ELLA_QUE_ES_OTRA = 'Te fijas en lo que le falta a la persona que tienes delante antes de que ella misma lo sepa.';
const ELLA_QUE_ES_UNA_COSA = 'Una decision que ya has tomado: vuelves sobre ella igual que quien pasa la lengua por un diente roto.';

let queDevuelve = areaCon(null);
let marcaElCorrector = [];
let llamadasDeArea = 0;
let vecesQueSeLlamaAlCorrector = 0;

globalThis.fetch = async (url, opts = {}) => {
  if (!String(url).includes('api.anthropic.com')) return { ok: true, status: 200, json: async () => ({}) };
  const cuerpo = JSON.parse(opts.body || '{}');
  const sistema = String(Array.isArray(cuerpo.system) ? (cuerpo.system[0] || {}).text || '' : cuerpo.system || '');
  if (cuerpo.messages && cuerpo.messages[0] && cuerpo.messages[0].content === 'ok') {
    return { ok: true, status: 200, json: async () => ({ content: [{ text: '{' }] }) };
  }
  if (sistema.startsWith('Eres un corrector de estilo')) {
    vecesQueSeLlamaAlCorrector++;
    return { ok: true, status: 200, json: async () => ({ content: [{ text: JSON.stringify({ frases: marcaElCorrector }) }] }) };
  }
  if (sistema.startsWith('Eres un maquetador') || sistema.startsWith('Eres un corrector.')) {
    return { ok: true, status: 200, json: async () => ({ content: [{ text: '{"frases":[]}' }] }) };
  }
  // La lista de rasgos que cierra el informe es otra llamada, con otro
  // prompt, y no escribe ninguna area: no cuenta como generacion. Esta
  // prueba no mide la lista, asi que se le contesta que no y se sigue.
  if (sistema.startsWith('Eres la misma experta')) {
    return { ok: false, status: 503, text: async () => 'la lista de rasgos no es lo que mide esta prueba' };
  }
  llamadasDeArea++;
  return { ok: true, status: 200, json: async () => ({ content: [{ text: queDevuelve }] }) };
};

const stripeFalsoRuta = path.join(AQUI, '.stripe-falso-corrector.mjs');
const chatRuta = path.join(AQUI, '.chat-corrector-bajo-prueba.mjs');
const original = fs.readFileSync(path.join(RAIZ, 'api', 'chat.js'), 'utf8');
const MARCA = "import Stripe from 'stripe';";
if (!original.includes(MARCA)) {
  console.error('✘ api/chat.js ya no importa Stripe como se esperaba; hay que actualizar esta prueba.');
  process.exit(1);
}
fs.writeFileSync(stripeFalsoRuta, STRIPE_FALSO);
fs.writeFileSync(chatRuta, original.replace(MARCA, "import Stripe from './.stripe-falso-corrector.mjs';"));

process.env.STRIPE_SECRET_KEY = 'sk_test';
process.env.ANTHROPIC_API_KEY = 'sk-ant-test';
process.env.BREVO_API_KEY = '';

const limpiar = () => { for (const f of [stripeFalsoRuta, chatRuta]) try { fs.unlinkSync(f); } catch {} };

let fallos = 0;
const c = (desc, ok, det = '') => {
  console.log(`  ${ok ? '✔' : '✘ FALLA'}  ${desc}${det ? '  [' + det + ']' : ''}`);
  if (!ok) fallos++;
};

// Lo que chat.js escribe en el registro, para comprobar que avisa.
const apuntes = [];
const warnOriginal = console.warn;
console.warn = (...a) => { apuntes.push(a.join(' ')); };

let n = 0;
try {
  const { default: chat } = await import(chatRuta);

  const generar = async (devuelve, marca) => {
    const sid = 'cs_corrector_' + (++n);
    TIENDA.set(sid, {
      id: sid, payment_status: 'paid', customer_email: 'cliente@ejemplo.com',
      customer_details: { email: 'cliente@ejemplo.com' }, metadata: { nombre: 'Ana Ruiz' },
    });
    queDevuelve = devuelve;
    marcaElCorrector = marca;
    llamadasDeArea = 0;
    vecesQueSeLlamaAlCorrector = 0;
    apuntes.length = 0;
    const r = { code: 0, body: null };
    r.status = x => { r.code = x; return r; };
    r.json = b => { r.body = b; return r; };
    r.setHeader = () => {};
    await chat({ method: 'POST', body: { session_id: sid, nombre: 'Ana Ruiz', cartaTexto: 'Sol: Piscis' } }, r);
    return r;
  };

  console.log('\n  api/chat.js — el corrector que leía ya no está; lo que caza por palabras, sí\n');

  // ── A. CONTROL: nada que marcar ─────────────────────────────────
  console.log('  A. el corrector no marca nada');
  const a = await generar(areaCon(null), []);
  c('el informe sale', a.code === 200, 'HTTP ' + a.code);
  c('siete áreas, siete llamadas', llamadasDeArea === 7, llamadasDeArea + ' llamadas');

  // ── B. EL CORRECTOR QUE LEIA YA NO EXISTE ───────────────────────
  //
  // Se quito el 26 de agosto. Costaba una llamada por area -siete por
  // informe- y en el informe del 25 marco seis frases de las que CUATRO
  // estaban bien escritas, "Tu no tienes ese problema, Raquel" entre ellas.
  // Aqui se vigila que no vuelva: si alguien lo reenchufa, esta prueba se
  // cae y se ven las siete llamadas de mas.
  //
  // La frase que marcaba se le sigue dando al informe, para comprobar que
  // sale entera hacia el cliente sin que nadie la toque.
  console.log('\n  B. el corrector que leía ya no existe');
  const b = await generar(areaCon(null), [FRASE_MARCADA]);
  c('el informe sale igual', b.code === 200, 'HTTP ' + b.code);
  c('NO se vuelve a pedir ni un área: 7 llamadas para 7 áreas',
    llamadasDeArea === 7, llamadasDeArea + ' llamadas');
  c('y al corrector no se le llama NI UNA vez',
    vecesQueSeLlamaAlCorrector === 0, vecesQueSeLlamaAlCorrector + ' veces');
  c('ni queda ningún apunte suyo en el registro',
    !apuntes.some(x => x.includes('habla de ella desde fuera')),
    apuntes.filter(x => x.includes('habla de ella desde fuera')).join(' | ').slice(0, 80));
  c('el texto del área llega entero al cliente',
    String(b.body?.texto || '').includes(FRASE_MARCADA));

  // ── C. EL "ELLA + VERBO" SÍ CUESTA UNA VUELTA ───────────────────
  console.log('\n  C. un "ella responde" impreso, que sí es un fallo que se ve');
  const d = await generar(areaCon(CON_ELLA), []);
  c('el informe sale', d.code === 200, 'HTTP ' + d.code);
  c('SÍ se vuelve a pedir el área: 14 llamadas para 7 áreas',
    llamadasDeArea === 14, llamadasDeArea + ' llamadas');
  c('y se dice por qué', apuntes.some(x => x.includes('floja') && x.includes('desde fuera')));

  // ── C bis. LOS "ella" QUE NO SON ELLA NO CUESTAN NADA ───────────
  //
  // Un "ella" suelto no basta para saber que se ha salido del tú. En el
  // estudio del 25 de agosto el detector marcó dos áreas perfectas y se
  // rehicieron enteras: 54 segundos y dos llamadas de las caras tiradas.
  console.log('\n  C bis. un "ella" que es OTRA persona, o una cosa, no cuesta un área');
  const cb1 = await generar(areaCon(ELLA_QUE_ES_OTRA), []);
  c('el informe sale', cb1.code === 200, 'HTTP ' + cb1.code);
  c('"...antes de que ella misma lo sepa" NO cuesta una vuelta',
    llamadasDeArea === 7, llamadasDeArea + ' llamadas');
  c('y el texto llega entero al cliente',
    String(cb1.body?.texto || '').includes(ELLA_QUE_ES_OTRA));

  const cb2 = await generar(areaCon(ELLA_QUE_ES_UNA_COSA), []);
  c('"vuelves sobre ella" (la decisión) tampoco',
    llamadasDeArea === 7, llamadasDeArea + ' llamadas');

  // ── D. LO QUE SÍ SE ARREGLA VOLVIENDO A PEDIR SIGUE IGUAL ───────
  console.log('\n  D. la escena copiada, que sí se arregla, no se ha tocado');
  const e = await generar(areaCon(ESCENA), []);
  c('el informe sale', e.code === 200, 'HTTP ' + e.code);
  const areasE = String(e.body?.texto || '').split(SEPARADOR_AREAS);
  const repetida = areasE.filter(t => t.split(ESCENA).length - 1 !== 1).length;
  c('la escena se lee UNA vez en cada área', repetida === 0, repetida + ' área(s) mal');
  c('y se ha arreglado sin volver a pedir el área',
    llamadasDeArea === 7, llamadasDeArea + ' llamadas');

} catch (err) {
  console.warn = warnOriginal;
  console.error('\n  ✘ la prueba reventó:', err.stack || err.message);
  fallos++;
} finally {
  console.warn = warnOriginal;
  limpiar();
}

console.log(fallos ? `\n  ${fallos} COMPROBACIONES FALLIDAS\n` : '\n  todo pasa\n');
process.exit(fallos ? 1 : 0);
