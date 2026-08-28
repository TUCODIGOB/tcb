// ═════════════════════════════════════════════════════════════════
// test/pdf-rueda-planetas.test.mjs
//
// Vigila el reparto en anillos de los planetas de la rueda del PDF.
// Cuando dos planetas caen muy juntos, se dibujan en anillos distintos
// para que no se pisen; decidir "muy juntos" exige medir la distancia
// CIRCULAR, no restar las longitudes.
//
// POR QUE LA CARTA ES LA DEL 15/3/1953: en esa carta el Sol esta en
// 354,6° y Mercurio en 0,3°. Estan a 5,7° de verdad, pero una resta
// cruda los cree a 354° y los mete en el mismo anillo, encima uno de
// otro. Es el unico tipo de carta donde ese fallo se ve, y por eso la
// prueba usa esta y no otra: con una carta que no cruce el 0° de Aries,
// romper la distancia circular no cambia nada y la prueba no se entera.
//
// La comprobacion 1 existe para que esto no deje de ser cierto sin que
// nadie se de cuenta: si algun dia el calculo cambia y esa carta ya no
// cruza el 0°, la prueba avisa en vez de seguir en verde sin probar nada.
//
// SI CAMBIAS LA RUEDA A PROPOSITO: mira el PDF con tus ojos primero, y
// solo entonces actualiza HUELLA_RUEDA con el valor que imprime la
// prueba. Actualizarla sin mirar la deja sin sentido.
//
// Ejecutar:  node test/pdf-rueda-planetas.test.mjs
// Sin red y sin dependencias. No toca ningun fichero de produccion.
// ═════════════════════════════════════════════════════════════════

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.join(AQUI, '..');

// Huella del dibujo de la rueda para la carta de abajo. Ver la nota.
const HUELLA_RUEDA = '8c8d0500661cd9cd';

const CARTA = { year: 1953, month: 3, day: 15, localHour: 12, localMin: 0,
                latDeg: 40.4168, lonDeg: -3.7038, tzOffset: 1 };
// Separacion por debajo de la cual generar-pdf manda los planetas a
// anillos distintos. Si se cambia alli, hay que cambiarla aqui.
const MIN_SEP = 8;

const stripeFalso = path.join(AQUI, '.stripe-falso-rueda.mjs');
const copias = [];
function prepararCopia(nombreApi, destino) {
  const original = fs.readFileSync(path.join(RAIZ, 'api', nombreApi), 'utf8');
  const MARCA = "import Stripe from 'stripe';";
  if (!original.includes(MARCA)) {
    console.error(`X api/${nombreApi} ya no importa Stripe como se esperaba; hay que actualizar esta prueba.`);
    process.exit(1);
  }
  const ruta = path.join(AQUI, destino);
  fs.writeFileSync(ruta, original.replace(MARCA, "import Stripe from './.stripe-falso-rueda.mjs';"));
  copias.push(ruta);
  return ruta;
}

fs.writeFileSync(stripeFalso, `
export default function Stripe() {
  return { checkout: { sessions: {
    async retrieve() {
      return { payment_status: 'paid', customer_email: 'prueba@ejemplo.com',
               customer_details: {}, metadata: { generacion_token: 'tok' } };
    },
    async update() {},
  } } };
}`);
copias.push(stripeFalso);

// Las imagenes y las fuentes se leen del propio repo en vez de por red.
globalThis.fetch = async (url, opts = {}) => {
  const u = String(url);
  if (u.includes('api.brevo.com')) return { ok: true, status: 201, json: async () => ({}) };
  const b = fs.readFileSync(path.join(RAIZ, u.replace('https://origennatal.com', '')));
  return { ok: true, status: 200, arrayBuffer: async () => b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) };
};
process.env.STRIPE_SECRET_KEY = 'sk_test';
process.env.BREVO_API_KEY = '';

const limpiar = () => { for (const f of copias) try { fs.unlinkSync(f); } catch {} };

// El dibujo de la rueda es, con diferencia, el flujo vectorial mas grande
// del documento: el resto de paginas son una imagen de fondo y texto.
function huellaRueda(buf) {
  const s = buf.toString('latin1');
  const flujos = [...s.matchAll(/stream\r?\n([\s\S]*?)\r?\nendstream/g)]
    .map(m => m[1]).filter(f => !f.startsWith('\xff\xd8'));
  const rueda = flujos.reduce((a, b) => (b.length > a.length ? b : a), '');
  return crypto.createHash('sha256').update(rueda, 'latin1').digest('hex').slice(0, 16);
}

const norm = d => ((d % 360) + 360) % 360;
const sepCircular = (a, b) => { const d = Math.abs(norm(a) - norm(b)); return d > 180 ? 360 - d : d; };

let fallos = 0;
const c = (desc, ok, det = '') => {
  console.log(`  ${ok ? 'OK ' : 'X  '} ${desc}${det ? '  [' + det + ']' : ''}`);
  if (!ok) fallos++;
};

try { await import('jspdf'); } catch {
  limpiar();
  console.log('\n  SALTADA: falta jspdf. Ejecuta "npm install" en la raiz del repo.');
  console.log('  Esta prueba NO ha comprobado nada.\n');
  process.exit(0);
}

try {
  const { default: calc } = await import(prepararCopia('calcular-carta.js', '.carta-rueda.mjs'));
  const { default: gen }  = await import(prepararCopia('generar-pdf.js', '.pdf-rueda.mjs'));
  const res = () => {
    const r = { code: 0, body: null };
    r.status = x => { r.code = x; return r; };
    r.json = b => { r.body = b; return r; };
    r.setHeader = () => {};
    return r;
  };

  console.log('\n  rueda del PDF — reparto de planetas en anillos\n');

  const rc = res();
  await calc({ method: 'POST', body: { session_id: 'x', ...CARTA } }, rc);
  if (rc.code !== 200) { c('la carta se calcula', false, 'HTTP ' + rc.code); throw new Error('sin carta'); }
  const carta = rc.body;

  // ── 1. Que esta carta SIGUE ejerciendo el caso que queremos probar ──
  const CAMPOS = ['solRaw','lunaRaw','mercRaw','venRaw','marRaw','jupRaw','satRaw',
                  'uraRaw','nepRaw','plutRaw','quirRaw','ascRaw'];
  let cruce = null;
  for (let i = 0; i < CAMPOS.length && !cruce; i++) {
    for (let j = i + 1; j < CAMPOS.length; j++) {
      const a = carta[CAMPOS[i]], b = carta[CAMPOS[j]];
      const cruda = Math.abs(a - b);
      if (sepCircular(a, b) < MIN_SEP && cruda > 180) {
        cruce = { a: CAMPOS[i], b: CAMPOS[j], va: a, vb: b, real: sepCircular(a, b), cruda };
        break;
      }
    }
  }
  c('la carta cruza el 0° de Aries (si no, esta prueba no probaria nada)',
    Boolean(cruce),
    cruce ? `${cruce.a}=${cruce.va.toFixed(1)}° y ${cruce.b}=${cruce.vb.toFixed(1)}°: separados ${cruce.real.toFixed(1)}° reales, ${cruce.cruda.toFixed(1)}° por resta cruda`
          : 'ningun par cruza el 0°: hay que buscar otra fecha');

  // ── 2. El PDF se genera ──
  const parr = 'Parrafo de prueba con la longitud habitual de un informe real de cliente para que el documento salga como siempre.';
  const rp = res();
  await gen({ method: 'POST', body: {
    session_id: 'x', token: 'tok', nombre: 'Prueba Cruce', sexo: 'Mujer',
    fechaNice: '15 de marzo de 1953', hora: '12:00', lugar: 'Madrid, España',
    edad: 70, carta, areas: Array(7).fill(parr),
  } }, rp);
  c('el PDF se genera', rp.code === 200, 'HTTP ' + rp.code);

  // ── 3. La rueda se dibuja igual que la ultima vez que se reviso ──
  if (rp.code === 200) {
    const buf = Buffer.from(rp.body.pdfBase64.split(',')[1], 'base64');
    const h = huellaRueda(buf);
    if (HUELLA_RUEDA === 'PENDIENTE') {
      console.log(`\n  huella de la rueda: ${h}\n  (ponla en HUELLA_RUEDA arriba)\n`);
      fallos++;
    } else {
      c('la rueda se dibuja igual que la referencia', h === HUELLA_RUEDA, h);
    }
  }

} catch (err) {
  console.error('\n  X la prueba reventó:', err.message);
  fallos++;
} finally {
  limpiar();
}

console.log(fallos ? `\n  ${fallos} COMPROBACIONES FALLIDAS\n` : '\n  todo pasa\n');
process.exit(fallos ? 1 : 0);
