// ═════════════════════════════════════════════════════════════════
// test/entrega-email-p1.test.mjs
//
// Comprueba que el informe del P1 SIEMPRE sale por correo.
//
// El fallo que cierra esta prueba: hasta ahora el correo lo disparaba el
// navegador del cliente (la pagina esperaba la respuesta de /api/generar-pdf y
// solo entonces llamaba a /api/save-pdf). Si el cliente cerraba la pestana o se
// le bloqueaba el movil durante los ~3 minutos que tarda el informe, save-pdf
// no se llamaba nunca: el cliente pagaba y no recibia nada, y en Brevo no
// quedaba ni rastro. Paso de verdad el 6 de septiembre de 2025.
//
// Ahora el correo lo manda /api/generar-pdf desde el servidor, en cuanto el PDF
// existe. Lo que se prueba aqui es justo eso, y que la red de seguridad
// (save-pdf) sigue existiendo sin mandar copias de mas.
//
// Ejecutar:  node test/entrega-email-p1.test.mjs
// Sin red y sin Stripe: cliente de Stripe de mentira y fetch interceptado. Las
// fuentes y las imagenes se sirven desde el propio repositorio, asi que el PDF
// que se genera es uno de verdad. No toca ningun fichero de produccion.
// ═════════════════════════════════════════════════════════════════

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.join(AQUI, '..');

// ── Stripe de mentira: una tienda en memoria, con retrieve y update por
//    separado y sin atomicidad, como la API real.
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

// ── Brevo de mentira: se apunta todo lo que se le manda.
const EMAILS = [];            // correos al cliente (con adjunto)
const AVISOS = [];            // correos a la tienda
const CONTACTOS = [];         // actualizaciones de contacto
let brevoCae = false;         // para simular a Brevo caido

const ASSETS = path.join(RAIZ);

globalThis.fetch = async (url, opciones = {}) => {
  const u = String(url);

  // Fuentes e imagenes del PDF: se sirven desde el repositorio.
  if (u.startsWith('https://origennatal.com/')) {
    const rel = u.replace('https://origennatal.com/', '');
    const fichero = path.join(ASSETS, rel);
    if (!fs.existsSync(fichero)) return { ok: false, status: 404 };
    const buf = fs.readFileSync(fichero);
    return { ok: true, status: 200, arrayBuffer: async () => buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) };
  }

  // Envio de correo.
  if (u.includes('api.brevo.com/v3/smtp/email')) {
    const cuerpo = JSON.parse(opciones.body);
    const esAviso = String(cuerpo.to?.[0]?.email || '').includes('origennatal')
      && !cuerpo.attachment;
    if (esAviso) {
      AVISOS.push(cuerpo);
      return { ok: true, status: 201, json: async () => ({}), text: async () => '' };
    }
    if (brevoCae) {
      return { ok: false, status: 500, text: async () => 'Brevo caido (simulado)' };
    }
    EMAILS.push(cuerpo);
    return { ok: true, status: 201, json: async () => ({}), text: async () => '' };
  }

  // Actualizacion del contacto.
  if (u.includes('api.brevo.com/v3/contacts/')) {
    CONTACTOS.push(JSON.parse(opciones.body));
    return { ok: true, status: 204, text: async () => '' };
  }

  return { ok: true, status: 200, json: async () => ({}), text: async () => '' };
};

// ── Copias de los dos endpoints con el import de Stripe cambiado. Se dejan en
//    test/ para que sus "../lib/..." sigan resolviendo, y se borran al acabar.
//    El resto del fichero es el de produccion, tal cual.
const stripeFalsoRuta = path.join(AQUI, '.stripe-falso-entrega.mjs');
const generarRuta = path.join(AQUI, '.generar-pdf-bajo-prueba.mjs');
const cartaRuta = path.join(AQUI, '.calcular-carta-entrega.mjs');
const saveRuta = path.join(AQUI, '.save-pdf-bajo-prueba.mjs');
const MARCA = "import Stripe from 'stripe';";

const copiar = (origen, destino) => {
  const texto = fs.readFileSync(path.join(RAIZ, 'api', origen), 'utf8');
  if (!texto.includes(MARCA)) {
    console.error(`✘ api/${origen} ya no importa Stripe como se esperaba; hay que actualizar esta prueba.`);
    process.exit(1);
  }
  fs.writeFileSync(destino, texto.replace(MARCA, "import Stripe from './.stripe-falso-entrega.mjs';"));
};

fs.writeFileSync(stripeFalsoRuta, STRIPE_FALSO);
copiar('generar-pdf.js', generarRuta);
copiar('save-pdf.js', saveRuta);
copiar('calcular-carta.js', cartaRuta);

process.env.STRIPE_SECRET_KEY = 'sk_test';
process.env.BREVO_API_KEY = 'brevo-test';

const limpiar = () => { for (const f of [stripeFalsoRuta, generarRuta, saveRuta, cartaRuta]) try { fs.unlinkSync(f); } catch {} };

let fallos = 0;
const comprobar = (desc, ok, detalle = '') => {
  console.log(`  ${ok ? '✔' : '✘ FALLA'}  ${desc}${detalle ? '  [' + detalle + ']' : ''}`);
  if (!ok) fallos++;
};

const respuesta = () => {
  const r = { code: 0, body: null };
  r.status = c => { r.code = c; return r; };
  r.json = b => { r.body = b; return r; };
  r.setHeader = () => {};
  return r;
};

// Una compra pagada del P1, con la reserva ya cogida por chat.js.
const compra = (sid, token) => ({
  id: sid,
  payment_status: 'paid',
  customer_email: 'cliente@ejemplo.com',
  customer_details: { email: 'cliente@ejemplo.com' },
  metadata: {
    nombre: 'Ana Ruiz',
    generacion_token: token,
    generacion_desde: String(Date.now()),
    intentos_informe: '1',
  },
});

const AREAS = Array.from({ length: 7 }, (_, i) =>
  `Area ${i + 1} del informe de prueba. `.repeat(20));

// La carta se calcula de verdad con api/calcular-carta.js: el PDF dibuja la
// rueda con ella y sin carta no llega ni a generarse.
let CARTA = null;

const pedirPDF = (generar, sid, token) => {
  const r = respuesta();
  return generar({
    method: 'POST',
    body: {
      session_id: sid, token,
      nombre: 'Ana Ruiz', sexo: 'mujer',
      fechaNice: '14 de marzo de 1990', hora: '10:30',
      lugar: 'Madrid', edad: '35',
      carta: CARTA, areas: AREAS, rasgos: null,
    },
  }, r).then(() => r);
};

try {
  const { default: generarPDF } = await import(generarRuta);
  const { default: savePDF } = await import(saveRuta);
  const { default: calcularCarta } = await import(cartaRuta);

  const rc = respuesta();
  // Compra limpia, sin reserva cogida: calcular-carta rechaza las que ya
  // tienen una generacion en marcha.
  TIENDA.set('cs_test_carta', {
    id: 'cs_test_carta', payment_status: 'paid',
    customer_email: 'cliente@ejemplo.com', customer_details: { email: 'cliente@ejemplo.com' },
    metadata: { nombre: 'Ana Ruiz' },
  });
  await calcularCarta({ method: 'POST', body: {
    session_id: 'cs_test_carta', year: 1990, month: 3, day: 14,
    localHour: 10, localMin: 30, latDeg: 40.4168, lonDeg: -3.7038, tzOffset: 1,
  } }, rc);
  if (rc.code !== 200) { console.error('No se pudo calcular la carta de prueba:', rc.code, rc.body); process.exit(1); }
  CARTA = rc.body;

  console.log('\n  Entrega del informe P1 por correo\n');

  // ═══════════════════════════════════════════════════════════════
  // 1. El caso de ayer: el cliente cierra el movil y NADIE llama a
  //    save-pdf. El correo tiene que salir igual.
  // ═══════════════════════════════════════════════════════════════
  const SID1 = 'cs_test_movil_cerrado';
  TIENDA.set(SID1, compra(SID1, 'tok1'));

  const r1 = await pedirPDF(generarPDF, SID1, 'tok1');

  comprobar('el informe se genera', r1.code === 200 && Boolean(r1.body?.pdfBase64), 'HTTP ' + r1.code);
  comprobar('el correo al cliente SALE sin que el navegador pida nada',
    EMAILS.length === 1, EMAILS.length + ' correos');
  comprobar('va al email de la compra',
    EMAILS[0]?.to?.[0]?.email === 'cliente@ejemplo.com', EMAILS[0]?.to?.[0]?.email || '(ninguno)');
  comprobar('lleva el PDF adjunto y no va vacio',
    (EMAILS[0]?.attachment?.[0]?.content || '').length > 10000,
    (EMAILS[0]?.attachment?.[0]?.content || '').length + ' caracteres de base64');
  comprobar('el adjunto es base64 limpio, sin la cabecera "data:"',
    !String(EMAILS[0]?.attachment?.[0]?.content || 'data:').startsWith('data:'));
  comprobar('el adjunto es un PDF de verdad',
    Buffer.from(EMAILS[0]?.attachment?.[0]?.content || '', 'base64').subarray(0, 5).toString() === '%PDF-');
  comprobar('el fichero se llama como siempre',
    EMAILS[0]?.attachment?.[0]?.name === 'TuDisenoDeOrigen_Ana_Ruiz.pdf', EMAILS[0]?.attachment?.[0]?.name);
  comprobar('usa la plantilla de entrega de Brevo (28)', EMAILS[0]?.templateId === 28);
  comprobar('la compra queda marcada como enviada',
    TIENDA.get(SID1).metadata.email_enviado === 'si');
  comprobar('el contacto de Brevo queda como "entregado"',
    CONTACTOS.at(-1)?.attributes?.ESTADO_INFORME === 'entregado');
  comprobar('el contacto conserva la fecha de nacimiento',
    CONTACTOS.at(-1)?.attributes?.FECHA_NAC === '1990-03-14', CONTACTOS.at(-1)?.attributes?.FECHA_NAC);
  comprobar('no se avisa a la tienda de ningun fallo', AVISOS.length === 0, AVISOS.length + ' avisos');

  // ═══════════════════════════════════════════════════════════════
  // 2. El navegador SI sigue abierto y llama a save-pdf, como siempre.
  //    No debe salir un segundo correo.
  // ═══════════════════════════════════════════════════════════════
  const antes = EMAILS.length;
  const r2 = respuesta();
  await savePDF({
    method: 'POST',
    body: { session_id: SID1, token: 'tok1', pdfBase64: r1.body.pdfBase64, nombre: 'Ana Ruiz' },
  }, r2);

  comprobar('save-pdf no manda una segunda copia', EMAILS.length === antes, EMAILS.length + ' correos en total');
  comprobar('save-pdf responde "ya enviado" (409)', r2.code === 409, 'HTTP ' + r2.code);

  // ═══════════════════════════════════════════════════════════════
  // 3. Brevo falla durante la generacion. El envio no se da por hecho:
  //    la compra NO se marca, se avisa a la tienda, y save-pdf reintenta
  //    con exito. El cliente recibe su informe igual.
  // ═══════════════════════════════════════════════════════════════
  const SID2 = 'cs_test_brevo_caido';
  TIENDA.set(SID2, compra(SID2, 'tok2'));

  brevoCae = true;
  const r3 = await pedirPDF(generarPDF, SID2, 'tok2');
  brevoCae = false;

  comprobar('el informe se genera aunque el correo falle', r3.code === 200 && Boolean(r3.body?.pdfBase64), 'HTTP ' + r3.code);
  comprobar('NO se marca como enviado si el envio fallo',
    TIENDA.get(SID2).metadata.email_enviado !== 'si');
  comprobar('se avisa a la tienda del fallo', AVISOS.length === 1, AVISOS.length + ' avisos');

  const antes2 = EMAILS.length;
  const r4 = respuesta();
  await savePDF({
    method: 'POST',
    body: { session_id: SID2, token: 'tok2', pdfBase64: r3.body.pdfBase64, nombre: 'Ana Ruiz' },
  }, r4);

  comprobar('la red de seguridad funciona: save-pdf SI reintenta y lo envia',
    r4.code === 200 && EMAILS.length === antes2 + 1, 'HTTP ' + r4.code);
  comprobar('y entonces si queda marcado como enviado',
    TIENDA.get(SID2).metadata.email_enviado === 'si');

  console.log(`\n  ${fallos === 0 ? '✔ TODO CORRECTO' : '✘ ' + fallos + ' comprobacion(es) fallan'}\n`);
} catch (err) {
  console.error('\n✘ La prueba reventó:', err);
  fallos++;
} finally {
  limpiar();
}

process.exit(fallos === 0 ? 0 : 1);
