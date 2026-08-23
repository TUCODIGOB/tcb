// ═════════════════════════════════════════════════════════════════
// test/chat-generacion-en-curso.test.mjs
//
// Comprueba la guarda "st.ocupada" de api/chat.js: si ya hay una
// generacion en marcha para esa compra, una segunda peticion se rechaza
// sin gastar nada en el modelo.
//
// Por que existe este fichero aparte: esa guarda es la ULTIMA de tres.
// La pagina para antes en verify-payment y en calcular-carta, asi que
// cualquier prueba que use el recorrido normal nunca la ejecuta — se
// queda en verde aunque la guarda no exista. La unica forma de probarla
// es llamar a /api/chat directamente, que es justo lo que haria alguien
// con el enlace saltandose la pagina.
//
// Ejecutar:  node test/chat-generacion-en-curso.test.mjs
// Sin red y sin Stripe: se sustituye el cliente de Stripe por uno de
// mentira y se intercepta fetch. No toca ningun fichero de produccion.
// ═════════════════════════════════════════════════════════════════

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { analizarArea, revisarBloques, montarArea } from '../lib/bloques.js';
import { vecesQueLaLlamaPorSuNombre } from '../lib/estilo.js';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.join(AQUI, '..');
const SID = 'cs_test_en_curso';

// ── Stripe de mentira: una tienda en memoria. retrieve y update son dos
//    llamadas separadas y sin atomicidad, como en la API real.
const TIENDA = new Map();
const espera = ms => new Promise(r => setTimeout(r, ms));
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
globalThis.__TIENDA = TIENDA;

// ── El area que devuelve el modelo de mentira.
//
// Desde que el area se pide por casillas (output_config.format), lo que
// devuelve el modelo es JSON, no texto con marcas dentro. Si esto se queda
// con el formato viejo, chat.js lo rechaza por no ser una estructura, se
// pasa la prueba entera reintentando y acaba en 500 sin haber comprobado
// nunca la guarda que viene a mirar.
const AREA_DE_MENTIRA = JSON.stringify({
  parrafos: [
    { ladillo: null, texto: 'Te levantas y lo primero que haces es repasar la lista de lo que tienes pendiente, y eso lo llevas haciendo desde siempre.' },
    { ladillo: 'La cuenta que no llevas', texto: 'Y mientras asientes, Ana, por dentro **estas calculando cuanto has ensenado de mas**, que es un trabajo que no descansa.' },
    { ladillo: null, texto: 'De ahi sale todo lo demas, que es lo que nadie te ha contado y **llevas media vida pagando sin enterarte**.' },
    { ladillo: 'Donde empezo esto', texto: '**Eso no se arregla apretando mas**, se arregla mirando de donde viene y quien te enseno a hacerlo asi.' },
  ],
  escena: { tras_parrafo: 1, texto: 'Son las once de la noche y todavia estas repasando el movil con la luz apagada.' },
  remate_herida: { tras_parrafo: 3, texto: 'Llevas media vida pidiendo permiso para ocupar tu propio sitio' },
  remate_fuerza: { tras_parrafo: 4, texto: 'Nadie aguanta tanto tiempo de pie sin que eso sea una fuerza' },
  pregunta: { tras_parrafo: 2, texto: '¿Cuantas veces te has callado algo por no montar un lio?' },
  cierre: 'Y hasta que no veas eso, vas a seguir buscando fuera lo que lleva anos esperandote dentro.',
});

// Y aqui esta el aviso. Si algun dia se le pide al area algo mas y este
// texto de mentira deja de cumplirlo, la prueba lo dice en una linea en vez
// de morirse reintentando y dejar de vigilar la guarda sin que nadie lo note.
{
  const montada = montarArea(JSON.parse(AREA_DE_MENTIRA));
  const faltan = revisarBloques(analizarArea(montada));
  // El nombre se revisa aparte de las marcas en api/chat.js, asi que aqui
  // tambien: la primera vez que se exigio, esta prueba se cayo sin que el
  // aviso dijera por que. "Ana" es el nombre de pila que usa la prueba.
  if (vecesQueLaLlamaPorSuNombre(montada, 'Ana') < 1) {
    faltan.push('el area de mentira no llama "Ana" a la clienta ni una vez, y api/chat.js lo exige');
  }
  if (faltan.length > 0) {
    console.error('\n  X El area de mentira de esta prueba ya no pasa la revision de lib/bloques.js:');
    for (const f of faltan) console.error('    - ' + f);
    console.error('\n  Arregla AREA_DE_MENTIRA aqui arriba. Mientras no pase, esta prueba');
    console.error('  no comprueba la guarda de "generacion en curso", solo se estrella.\n');
    process.exit(1);
  }
}

// ── Contamos lo unico que cuesta dinero: las llamadas al modelo.
let llamadasAlModelo = 0;
globalThis.fetch = async (url, opts = {}) => {
  const u = String(url);
  if (u.includes('api.anthropic.com')) {
    // El repaso de estilo que lee el area es otra llamada distinta de la que
    // escribe el area: se responde "no hay nada que corregir" y no cuenta como
    // generacion, que es lo que mide esta prueba.
    if (String(JSON.parse(opts.body || '{}').system || '').startsWith('Eres un corrector de estilo')) {
      return { ok: true, status: 200, json: async () => ({ content: [{ text: '{"frases":[]}' }] }) };
    }
    llamadasAlModelo++;
    await espera(800);                       // deja una ventana real de tiempo
    return { ok: true, status: 200, json: async () => ({ content: [{ text: AREA_DE_MENTIRA }] }) };
  }
  return { ok: true, status: 200, json: async () => ({}) };   // Brevo
};

// ── Copia de api/chat.js con el import de Stripe cambiado. Se deja en
//    test/ para que su "../lib/reserva.js" siga resolviendo bien, y se
//    borra al terminar. El resto del fichero es el de produccion, tal cual.
const stripeFalsoRuta = path.join(AQUI, '.stripe-falso.mjs');
const chatRuta = path.join(AQUI, '.chat-bajo-prueba.mjs');
const original = fs.readFileSync(path.join(RAIZ, 'api', 'chat.js'), 'utf8');
const MARCA = "import Stripe from 'stripe';";
if (!original.includes(MARCA)) {
  console.error('✘ api/chat.js ya no importa Stripe como se esperaba; hay que actualizar esta prueba.');
  process.exit(1);
}
fs.writeFileSync(stripeFalsoRuta, STRIPE_FALSO);
fs.writeFileSync(chatRuta, original.replace(MARCA, "import Stripe from './.stripe-falso.mjs';"));

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

  const respuesta = () => {
    const r = { code: 0, body: null };
    r.status = c => { r.code = c; return r; };
    r.json = b => { r.body = b; return r; };
    r.setHeader = () => {};
    return r;
  };
  const pedirInforme = (nombre) => {
    const r = respuesta();
    return chat({ method: 'POST', body: { session_id: SID, nombre, cartaTexto: 'Sol: Piscis' } }, r)
      .then(() => r);
  };

  TIENDA.set(SID, {
    id: SID, payment_status: 'paid', customer_email: 'cliente@ejemplo.com',
    customer_details: { email: 'cliente@ejemplo.com' }, metadata: { nombre: 'Ana Ruiz' },
  });

  console.log('\n  api/chat.js — guarda de "generacion ya en curso"\n');

  // 1. Arranca una generacion legitima y se la deja a medias.
  const enCurso = pedirInforme('Ana Ruiz');
  await espera(2200);   // pasada la reserva (incluye su confirmacion) y ya generando

  comprobar('la reserva esta cogida y la generacion en marcha',
    Boolean(TIENDA.get(SID).metadata.generacion_token) && llamadasAlModelo > 0,
    `${llamadasAlModelo} llamadas al modelo`);

  // 2. Segunda peticion DIRECTA a /api/chat, sin pasar por la pagina.
  const gastoAntes = llamadasAlModelo;
  const segunda = await pedirInforme('Alguien con el enlace');

  comprobar('se rechaza con 409', segunda.code === 409, 'HTTP ' + segunda.code);
  // El motivo confirma que quien corta es ESTA guarda y no otra cosa.
  comprobar('el motivo es "en_curso" (lo pone solo esta guarda)',
    segunda.body?.motivo === 'en_curso', segunda.body?.motivo || '(ninguno)');
  comprobar('no gasta ni una llamada al modelo',
    llamadasAlModelo === gastoAntes, `${llamadasAlModelo - gastoAntes} llamadas de mas`);
  comprobar('no consume intento del cliente',
    TIENDA.get(SID).metadata.intentos_informe === '1',
    'intentos=' + TIENDA.get(SID).metadata.intentos_informe);

  // 3. La generacion legitima termina sin enterarse de nada.
  const legitima = await enCurso;
  comprobar('la generacion legitima termina bien', legitima.code === 200, 'HTTP ' + legitima.code);
  comprobar('en total solo se generó una vez', llamadasAlModelo === 7, llamadasAlModelo + ' llamadas');

} catch (err) {
  console.error('\n  ✘ la prueba reventó:', err.message);
  fallos++;
} finally {
  limpiar();
}

console.log(fallos ? `\n  ${fallos} COMPROBACIONES FALLIDAS\n` : '\n  todo pasa\n');
process.exit(fallos ? 1 : 0);
