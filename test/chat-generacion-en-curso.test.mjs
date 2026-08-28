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

// ── Contamos lo unico que cuesta dinero: las llamadas al modelo.
let llamadasAlModelo = 0;
// Las dos listas de rasgos se piden antes que las areas y con otro encargo, asi
// que el modelo de mentira tiene que saber contestar a las dos cosas. Si a la
// peticion de las listas se le devuelve texto de area, no es JSON valido, las
// listas no salen y no se llega a escribir ni un area.
const LISTAS_DE_MENTIRA = JSON.stringify({
  fortalezas: [{ nombre: 'Aguante fuera de lo normal', descripcion: 'Sigues de pie donde otros se bajan.',
                 causa: 'Sostienes el esfuerzo sin depender de que salga bien.', origen: 'Saturno en Virgo, casa 12' }],
  desafios:   [{ nombre: 'Te cuesta pedir', descripcion: 'Prefieres cargar tu sola antes que decirlo.',
                 causa: 'Resolver te resulta mas comodo que exponerte a un no.', origen: 'Marte en Virgo, casa 12' }],
});

globalThis.fetch = async (url, opciones) => {
  const u = String(url);
  if (u.includes('api.anthropic.com')) {
    llamadasAlModelo++;
    await espera(800);                       // deja una ventana real de tiempo
    let esRasgos = false;
    try { esRasgos = String(JSON.parse(opciones.body).system || '').startsWith('Eres astrologa'); } catch (e) {}
    // api/chat.js descarta cualquier area de menos de 100 caracteres y la
    // reintenta, asi que la respuesta de mentira tiene que dar la talla.
    const texto = esRasgos ? LISTAS_DE_MENTIRA : 'Texto de area generado para la prueba. '.repeat(10);
    return { ok: true, status: 200, json: async () => ({ content: [{ text: texto }] }) };
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
    return chat({ method: 'POST', body: { session_id: SID, nombre, cartaTexto: '- Sol: Piscis (casa 6)\n- Saturno: Virgo (casa 12)\n- Marte: Virgo (casa 12)' } }, r)
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
  // 8 = las 7 areas + la peticion de las dos listas de rasgos, que sale a la
  // vez que ellas. Lo que se vigila aqui no es el numero, sino que la segunda
  // peticion no haya lanzado NINGUNA generacion mas.
  comprobar('en total solo se generó una vez', llamadasAlModelo === 8, llamadasAlModelo + ' llamadas');

} catch (err) {
  console.error('\n  ✘ la prueba reventó:', err.message);
  fallos++;
} finally {
  limpiar();
}

console.log(fallos ? `\n  ${fallos} COMPROBACIONES FALLIDAS\n` : '\n  todo pasa\n');
process.exit(fallos ? 1 : 0);
