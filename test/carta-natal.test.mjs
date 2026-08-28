// ═════════════════════════════════════════════════════════════════
// test/carta-natal.test.mjs
//
// Comprueba que el calculo de la carta natal sigue dando las mismas
// posiciones que dan dos fuentes externas e independientes:
// astronomy-engine (Sol, Luna y los 9 planetas) y las efemerides de
// Moshier (Quiron). Los valores de REFERENCIA de abajo salieron de esas
// dos librerias, no de este codigo.
//
// SOBRE LAS TOLERANCIAS: estan puestas a ~3 veces el error real medido
// del metodo (elementos de Standish/JPL) sobre 144 fechas entre 1940 y
// 2010. Antes eran 0,35° para todos los planetas, que es entre 2 y 18
// veces el error real: con esa holgura el calculo podia empeorar mucho
// sin que nadie se enterase. Una desviacion de 0,3° ya cambia el signo
// a ~1 de cada 100 clientes.
//
// Si un dia una tolerancia se queda corta por un cambio legitimo del
// metodo, hay que medir el error real de nuevo y volver a ponerla en
// ~3x. Subirla sin medir vacia la prueba.
//
// Ejecutar:  node test/carta-natal.test.mjs
// Sin red y sin dependencias: se sustituye el cliente de Stripe por uno
// de mentira. No toca ningun fichero de produccion.
// ═════════════════════════════════════════════════════════════════

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.join(AQUI, '..');

// ~3x el error real medido de cada cuerpo. Ver la nota de arriba.
const TOLERANCIA = {
  sol: 0.03, luna: 0.08, mercurio: 0.30, venus: 0.06, marte: 0.20,
  jupiter: 0.37, saturno: 0.52, urano: 0.10, neptuno: 0.07,
  pluton: 0.07, quiron: 0.20,
};

const CASOS = [
  {
    y: 1950, m: 2, d: 14, h: 9, mi: 20,
    lat: 40.4168, lon: {'sol': 325.0794, 'luna': 293.5288, 'mercurio': 299.4745, 'venus': 303.9471, 'marte': 191.0126, 'jupiter': 316.9304, 'saturno': 167.6491, 'urano': 91.1797, 'neptuno': 197.1602, 'pluton': 136.8121, 'quiron': 261.5465}, tzo: 1,
    ref: { sol: 325.0794, luna: 293.5288, mercurio: 299.4745, venus: 303.9471, marte: 191.0126, jupiter: 316.9304, saturno: 167.6491, urano: 91.1797, neptuno: 197.1602, pluton: 136.8121, quiron: 261.5465 },
    retro: { sol: false, luna: false, mercurio: false, venus: true, marte: true, jupiter: false, saturno: true, urano: null, neptuno: null, pluton: true },
  },
  {
    y: 1953, m: 3, d: 15, h: 12, mi: 0,
    lat: 40.4168, lon: {'sol': 354.5697, 'luna': 354.5204, 'mercurio': 0.3374, 'venus': 30.1983, 'marte': 26.4604, 'jupiter': 48.15, 'saturno': 206.083, 'urano': 104.4584, 'neptuno': 203.2558, 'pluton': 141.3131, 'quiron': 290.7475}, tzo: 1,
    ref: { sol: 354.5697, luna: 354.5204, mercurio: 0.3374, venus: 30.1983, marte: 26.4604, jupiter: 48.15, saturno: 206.083, urano: 104.4584, neptuno: 203.2558, pluton: 141.3131, quiron: 290.7475 },
    retro: { sol: false, luna: false, mercurio: true, venus: false, marte: false, jupiter: false, saturno: true, urano: null, neptuno: true, pluton: null },
  },
  {
    y: 1968, m: 7, d: 3, h: 23, mi: 5,
    lat: 41.3874, lon: {'sol': 101.9573, 'luna': 196.4409, 'mercurio': 83.7847, 'venus': 105.6582, 'marte': 98.471, 'jupiter': 152.859, 'saturno': 24.5616, 'urano': 175.5174, 'neptuno': 234.0212, 'pluton': 170.4687, 'quiron': 3.7452}, tzo: 2,
    ref: { sol: 101.9573, luna: 196.4409, mercurio: 83.7847, venus: 105.6582, marte: 98.471, jupiter: 152.859, saturno: 24.5616, urano: 175.5174, neptuno: 234.0212, pluton: 170.4687, quiron: 3.7452 },
    retro: { sol: false, luna: false, mercurio: false, venus: false, marte: false, jupiter: false, saturno: false, urano: false, neptuno: null, pluton: null },
  },
  {
    y: 1979, m: 11, d: 28, h: 6, mi: 45,
    lat: 37.3891, lon: {'sol': 245.3886, 'luna': 353.1892, 'mercurio': 229.811, 'venus': 269.5557, 'marte': 153.6059, 'jupiter': 158.9799, 'saturno': 175.6218, 'urano': 232.1655, 'neptuno': 259.6587, 'pluton': 200.8336, 'quiron': 40.8501}, tzo: 1,
    ref: { sol: 245.3886, luna: 353.1892, mercurio: 229.811, venus: 269.5557, marte: 153.6059, jupiter: 158.9799, saturno: 175.6218, urano: 232.1655, neptuno: 259.6587, pluton: 200.8336, quiron: 40.8501 },
    retro: { sol: false, luna: false, mercurio: true, venus: false, marte: false, jupiter: false, saturno: false, urano: false, neptuno: false, pluton: false },
  },
  {
    y: 1990, m: 3, d: 12, h: 4, mi: 30,
    lat: 43.263, lon: {'sol': 351.2962, 'luna': 179.1535, 'mercurio': 344.9126, 'venus': 306.3329, 'marte': 300.3582, 'jupiter': 91.1955, 'saturno': 293.0748, 'urano': 279.1305, 'neptuno': 284.2319, 'pluton': 227.6609, 'quiron': 101.4676}, tzo: 1,
    ref: { sol: 351.2962, luna: 179.1535, mercurio: 344.9126, venus: 306.3329, marte: 300.3582, jupiter: 91.1955, saturno: 293.0748, urano: 279.1305, neptuno: 284.2319, pluton: 227.6609, quiron: 101.4676 },
    retro: { sol: false, luna: false, mercurio: false, venus: false, marte: false, jupiter: false, saturno: false, urano: false, neptuno: null, pluton: null },
  },
  {
    y: 2001, m: 9, d: 21, h: 17, mi: 10,
    lat: 39.4699, lon: {'sol': 178.699, 'luna': 235.5697, 'mercurio': 204.9002, 'venus': 150.6611, 'marte': 277.0109, 'jupiter': 102.9517, 'saturno': 74.9465, 'urano': 321.5152, 'neptuno': 306.1837, 'pluton': 252.769, 'quiron': 263.6071}, tzo: 2,
    ref: { sol: 178.699, luna: 235.5697, mercurio: 204.9002, venus: 150.6611, marte: 277.0109, jupiter: 102.9517, saturno: 74.9465, urano: 321.5152, neptuno: 306.1837, pluton: 252.769, quiron: 263.6071 },
    retro: { sol: false, luna: false, mercurio: false, venus: false, marte: false, jupiter: false, saturno: null, urano: true, neptuno: null, pluton: null },
  },
  {
    y: 2013, m: 6, d: 8, h: 12, mi: 0,
    lat: 28.4636, lon: {'sol': 77.8163, 'luna': 75.5765, 'mercurio': 101.5326, 'venus': 96.5567, 'marte': 65.6999, 'jupiter': 85.962, 'saturno': 215.521, 'urano': 11.9093, 'neptuno': 335.3786, 'pluton': 280.8644, 'quiron': 343.8631}, tzo: 1,
    ref: { sol: 77.8163, luna: 75.5765, mercurio: 101.5326, venus: 96.5567, marte: 65.6999, jupiter: 85.962, saturno: 215.521, urano: 11.9093, neptuno: 335.3786, pluton: 280.8644, quiron: 343.8631 },
    retro: { sol: false, luna: false, mercurio: false, venus: false, marte: false, jupiter: false, saturno: true, urano: false, neptuno: null, pluton: true },
  },
];

const stripeFalso = path.join(AQUI, '.stripe-falso-carta.mjs');
const cartaRuta = path.join(AQUI, '.carta-bajo-prueba.mjs');
const original = fs.readFileSync(path.join(RAIZ, 'api', 'calcular-carta.js'), 'utf8');
const MARCA = "import Stripe from 'stripe';";
if (!original.includes(MARCA)) {
  console.error('X api/calcular-carta.js ya no importa Stripe como se esperaba; hay que actualizar esta prueba.');
  process.exit(1);
}
fs.writeFileSync(stripeFalso, `
export default function Stripe() {
  return { checkout: { sessions: {
    async retrieve() { return { payment_status: 'paid', metadata: {} }; },
    async update() {},
  } } };
}`);
fs.writeFileSync(cartaRuta, original.replace(MARCA, "import Stripe from './.stripe-falso-carta.mjs';"));
process.env.STRIPE_SECRET_KEY = 'sk_test';

const limpiar = () => { for (const f of [stripeFalso, cartaRuta]) try { fs.unlinkSync(f); } catch {} };

const norm = d => ((d % 360) + 360) % 360;
const sep = (a, b) => { const d = Math.abs(norm(a) - norm(b)); return d > 180 ? 360 - d : d; };
const CAMPO = {
  sol: 'solRaw', luna: 'lunaRaw', mercurio: 'mercRaw', venus: 'venRaw', marte: 'marRaw',
  jupiter: 'jupRaw', saturno: 'satRaw', urano: 'uraRaw', neptuno: 'nepRaw',
  pluton: 'plutRaw', quiron: 'quirRaw',
};
const MARCA_RETRO = {
  mercurio: 'mercRetro', venus: 'venRetro', marte: 'marRetro', jupiter: 'jupRetro',
  saturno: 'satRetro', urano: 'uraRetro', neptuno: 'nepRetro', pluton: 'plutRetro',
};

let fallos = 0, hechas = 0;
const c = (desc, ok, detalle = '') => {
  hechas++;
  if (!ok) { fallos++; console.log(`  X  ${desc}  ${detalle}`); }
};

try {
  const { default: calc } = await import(cartaRuta);
  const res = () => {
    const r = { code: 0, body: null };
    r.status = x => { r.code = x; return r; };
    r.json = b => { r.body = b; return r; };
    r.setHeader = () => {};
    return r;
  };

  console.log('\n  carta natal contra astronomy-engine y Moshier\n');

  for (const t of CASOS) {
    const r = res();
    await calc({ method: 'POST', body: {
      session_id: 'x', year: t.y, month: t.m, day: t.d,
      localHour: t.h, localMin: t.mi, latDeg: t.lat, lonDeg: t.lon, tzOffset: t.tzo,
    } }, r);
    const fecha = `${t.d}/${t.m}/${t.y}`;
    if (r.code !== 200) { c(`carta ${fecha}`, false, 'HTTP ' + r.code); continue; }
    const carta = r.body;

    for (const [cuerpo, campo] of Object.entries(CAMPO)) {
      const esperado = t.ref[cuerpo];
      if (esperado === undefined || Number.isNaN(esperado)) continue;
      const desvio = sep(carta[campo], esperado);
      c(`${cuerpo} ${fecha}`, desvio < TOLERANCIA[cuerpo],
        `desvio ${desvio.toFixed(4)}°, tolerancia ${TOLERANCIA[cuerpo]}°`);
    }

    for (const [cuerpo, marca] of Object.entries(MARCA_RETRO)) {
      const esperado = t.retro[cuerpo];
      if (esperado === null) continue;   // estacionario: el signo es ambiguo
      c(`retrogrado ${cuerpo} ${fecha}`, Boolean(carta[marca]) === esperado,
        `calculado ${carta[marca] ? 'R' : 'directo'}, referencia ${esperado ? 'R' : 'directo'}`);
    }
  }

} catch (err) {
  console.error('\n  X la prueba reventó:', err.message);
  fallos++;
} finally {
  limpiar();
}

console.log(fallos ? `\n  ${fallos} de ${hechas} COMPROBACIONES FALLIDAS\n`
                   : `\n  todo pasa (${hechas} comprobaciones)\n`);
process.exit(fallos ? 1 : 0);
