// ═════════════════════════════════════════════════════════════════
// test/rasgos-en-areas.test.mjs
//
// Vigila el REPARTO: la llamada que sale antes de las siete areas, lee la
// carta una vez y le dice a cada area cuales de los rasgos de la persona le
// tocan a ella.
//
// POR QUE EXISTE. Las siete areas se escriben a la vez y ninguna ve lo que
// escriben las otras, asi que las siete encuentran el tema mas fuerte de la
// carta y las siete cuentan lo mismo. En el estudio del 25 de agosto las
// siete areas se reducian a tres ideas y dos de ellas decian la misma frase.
//
// LO QUE SE COMPRUEBA AQUI ES QUE EL REPARTO LLEGA DE VERDAD:
//   - que sale ANTES que las areas (si sale a la vez, no sirve de nada)
//   - que a cada area le llegan LOS SUYOS y ninguno de los demas
//   - que un area sin rasgos se escribe igual que antes de existir esto
//   - que si el reparto se cae, el informe sale igual
//   - que no se cuela un rasgo con palabras de astrologo
//   - que ningun area recibe mas de tres
//   - y que la cache sigue funcionando: los rasgos NO van en el prompt de
//     sistema, que es el que se guarda y es identico en las siete
//
// Ejecutar:  node test/rasgos-en-areas.test.mjs
// Sin red: la API se sustituye por una falsa. No toca produccion.
// ═════════════════════════════════════════════════════════════════

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.join(AQUI, '..');
const creados = [];
const escribir = (nombre, texto) => {
  const r = path.join(AQUI, nombre);
  fs.writeFileSync(r, texto);
  creados.push(r);
  return r;
};
const limpiar = () => { for (const f of creados) try { fs.unlinkSync(f); } catch {} };

// La tienda de sesiones, igual que en las demas pruebas: update() tiene que
// guardar de verdad, porque el codigo reserva la sesion escribiendo en ella
// antes de gastar. Con un update() que no guarda nada, la reserva no se coge
// y el informe se rechaza con un 409.
const TIENDA = new Map();
globalThis.__TIENDA_REPARTO = TIENDA;
escribir('.stripe-falso-reparto.mjs', `
const T = globalThis.__TIENDA_REPARTO;
export default function Stripe() {
  return { checkout: { sessions: {
    async retrieve(id) { return T.get(id); },
    async update(id, d) {
      const s = T.get(id);
      s.metadata = { ...s.metadata, ...(d.metadata || {}) };
      T.set(id, s); return s;
    },
  } } };
}`);

const copiaChat = escribir('.chat-reparto.mjs',
  fs.readFileSync(path.join(RAIZ, 'api/chat.js'), 'utf8')
    .replace("import Stripe from 'stripe';", "import Stripe from './.stripe-falso-reparto.mjs';"));

process.env.STRIPE_SECRET_KEY = 'sk_test';
process.env.ANTHROPIC_API_KEY = 'k';
process.env.BREVO_API_KEY = '';

let fallos = 0;
const comprobar = (desc, ok, detalle = '') => {
  console.log(`  ${ok ? '✔' : '✘ FALLA'}  ${desc}${detalle ? '  [' + detalle + ']' : ''}`);
  if (!ok) fallos++;
};

// ── La API falsa ────────────────────────────────────────────────
// Distingue las llamadas por lo que piden: el arranque de la cache no escribe
// nada, el reparto pide el esquema del reparto, la lista pide dos listas y el
// area pide bloques.
const CARTA = `Carta natal calculada:
- Ascendente: 6.4 de Libra
- Sol: 21.4 de Piscis
- Luna: 13.5 de Capricornio`;

let repartoQueDevuelve = null;
let repartoFalla = null;
const llamadas = [];

function quePide(cuerpo) {
  const esquema = cuerpo.output_config?.format?.schema;
  const props = esquema?.properties || {};
  if (cuerpo.max_tokens === 16) return 'cache';
  if (props.rasgos) return 'reparto';
  if (props.fortalezas || props.desafios) return 'lista';
  if (props.bloques) return 'area';
  return 'otra';
}

// Un area que pasa todos los controles de calidad de chat.js: los cinco
// bloques con parrafos, negritas, el nombre, una pregunta y las cuatro
// casillas grandes. Copiada en forma de AREA_BUENA de area-por-casillas.
function porBloques(parrafos) {
  const nombres = ['arranque', 'hoy', 'origen', 'creencias', 'soltar'];
  const bloques = {};
  for (const n of nombres) bloques[n] = [];
  parrafos.forEach((x, i) => bloques[nombres[Math.min(i, nombres.length - 1)]].push(x));
  return { bloques };
}

const areaEscrita = () => JSON.stringify({
  ...porBloques([
    { ladillo: null, texto: 'Antes de contarte nada de ti, quiero que pienses un momento en las personas que sostienen, porque en cualquier familia hay una.' },
    { ladillo: 'La cuenta que no llevas', texto: 'Por fuera pareces tranquila, Raquel, y por dentro llevas una **maquina que no para de repasar** lo que acabas de decir.' },
    { ladillo: null, texto: 'En el trabajo se te nota enseguida, **revisas una tarea tres veces** cuando con una bastaria, y no es que dudes de tu criterio.' },
    { ladillo: 'Donde aprendiste la cuenta', texto: 'De pequena entendiste que el carino se ganaba haciendo las cosas bien, siendo la que no daba problemas nunca.' },
    { ladillo: null, texto: 'Y cuarenta anos despues sigues revisando y sigues anticipando, **sin que nadie te lo haya pedido** jamas.' },
  ]),
  escena: { tras_bloque: 'hoy', texto: 'Son las once de la noche y sigues con el movil en la mano sin mirar nada en concreto.' },
  remate_herida: { tras_bloque: 'creencias', texto: 'Te has pasado la vida demostrando que se puede confiar en ti' },
  remate_fuerza: { tras_bloque: 'arranque', texto: 'Muy poca gente sigue sosteniendo cuando ya no la mira nadie' },
  pregunta: { tras_bloque: 'origen', texto: '¿Cuando fue la ultima vez que alguien te dio las gracias por eso?' },
  cierre: 'No estas cansada de hacer cosas, estas cansada de que sea la unica prueba que te vale.',
});

globalThis.fetch = async (url, opts = {}) => {
  const u = String(url);
  if (u.includes('api.brevo.com')) return { ok: true, status: 201, json: async () => ({}) };
  const cuerpo = JSON.parse(opts.body || '{}');
  const tipo = quePide(cuerpo);
  const mensaje = cuerpo.messages?.[0]?.content || '';
  // El area manda "system" como lista de bloques (para poder marcar la cache)
  // y el reparto lo manda como texto suelto. Leyendo solo la forma de lista,
  // el prompt del reparto se registraba vacio y todo lo que se comprobara
  // sobre el pasaba sin comprobar nada.
  const sistema = String(Array.isArray(cuerpo.system)
    ? (cuerpo.system[0] || {}).text || ''
    : cuerpo.system || '');
  llamadas.push({ tipo, mensaje, sistema, cuando: llamadas.length });

  if (tipo === 'reparto') {
    if (repartoFalla) return { ok: false, status: repartoFalla };
    return { ok: true, status: 200, json: async () => ({
      content: [{ type: 'text', text: JSON.stringify({ rasgos: repartoQueDevuelve || [] }) }],
      stop_reason: 'end_turn', usage: {},
    }) };
  }
  if (tipo === 'lista') {
    return { ok: true, status: 200, json: async () => ({
      content: [{ type: 'text', text: JSON.stringify({ fortalezas: [], desafios: [] }) }],
      stop_reason: 'end_turn', usage: {},
    }) };
  }
  return { ok: true, status: 200, json: async () => ({
    content: [{ type: 'text', text: tipo === 'area' ? areaEscrita() : '{}' }],
    stop_reason: 'end_turn', usage: {},
  }) };
};

const { default: chat } = await import('./.chat-reparto.mjs');

const resp = () => {
  const r = { code: 0, body: null };
  r.status = x => { r.code = x; return r; };
  r.json = b => { r.body = b; return r; };
  r.setHeader = () => {};
  return r;
};

let nSesion = 0;
async function generar() {
  llamadas.length = 0;
  // Sesion nueva en cada generacion: una ya usada se rechaza a proposito
  // (un informe se genera una sola vez), y aqui generamos varias veces.
  const sid = 'cs_test_reparto_' + (++nSesion);
  TIENDA.set(sid, {
    payment_status: 'paid', customer_email: 'p@e.com',
    customer_details: { email: 'p@e.com' }, metadata: { nombre: 'Raquel Garcia' },
  });
  const r = resp();
  await chat({ method: 'POST', body: {
    session_id: sid, nombre: 'Raquel Garcia', sexo: 'mujer',
    fechaNice: '11 de marzo de 1980', hora: '20:15', lugar: 'Valencia, España',
    edad: 45, cartaTexto: CARTA,
  } }, r);
  return r;
}

const deArea = () => llamadas.filter(l => l.tipo === 'area');
// El mensaje de cada area lleva dentro "ÁREA N —". Buscar por ahi es lo unico
// que aguanta si alguna area se reintenta y las posiciones se descolocan.
const mensajeDelArea = n => {
  const suyas = deArea().filter(l => new RegExp(`ÁREA ${n} —`).test(l.mensaje));
  return suyas.length ? suyas[suyas.length - 1].mensaje : '';
};
const areasDistintas = () => new Set(deArea()
  .map(l => (l.mensaje.match(/ÁREA (\d) —/) || [])[1]).filter(Boolean)).size;

try {
  console.log('\n  api/chat.js — el reparto de rasgos entre las areas\n');

  // ── 1. EL REPARTO SALE ANTES QUE LAS AREAS ────────────────────
  // Si saliera a la vez, las areas no lo tendrian cuando empiezan a escribir
  // y todo esto no serviria absolutamente de nada.
  repartoQueDevuelve = [
    { nombre: 'Leal hasta el agotamiento', descripcion: 'Te quedas sosteniendo mucho despues de que deje de tener sentido quedarte.', area: 1 },
    { nombre: 'Cuentas lo que das', descripcion: 'Llevas sin querer la cuenta de lo que pones y de lo que te devuelven.', area: 1 },
    { nombre: 'Resuelves antes de que te pidan', descripcion: 'Ves lo que hace falta y te pones, sin esperar a que nadie lo diga.', area: 6 },
  ];
  const r1 = await generar();
  comprobar('el informe se genera', r1.code === 200, 'HTTP ' + r1.code);

  const iReparto = llamadas.findIndex(l => l.tipo === 'reparto');
  const iPrimeraArea = llamadas.findIndex(l => l.tipo === 'area');
  comprobar('el reparto se pide', iReparto >= 0);
  comprobar('y se pide ANTES de la primera area (si no, no sirve de nada)',
    iReparto >= 0 && iPrimeraArea > iReparto, `reparto en la ${iReparto}, primera area en la ${iPrimeraArea}`);
  comprobar('salen las 7 areas', areasDistintas() === 7, areasDistintas() + ' areas distintas');

  // ── 2. A CADA AREA LE LLEGAN LOS SUYOS, Y SOLO LOS SUYOS ──────
  const a1 = mensajeDelArea(1);
  const a6 = mensajeDelArea(6);
  comprobar('al area 1 le llegan sus dos rasgos',
    a1.includes('Leal hasta el agotamiento') && a1.includes('Cuentas lo que das'));
  comprobar('y NO le llega el que es del area 6',
    !a1.includes('Resuelves antes de que te pidan'));
  comprobar('al area 6 le llega el suyo', a6.includes('Resuelves antes de que te pidan'));
  comprobar('y NO le llegan los del area 1',
    !a6.includes('Leal hasta el agotamiento') && !a6.includes('Cuentas lo que das'));

  // ── 3. UN AREA SIN RASGOS SE ESCRIBE COMO SIEMPRE ─────────────
  // Nada de rellenar: si de un area no sale ninguno, esa area no debe recibir
  // ni un encabezado suelto que le haga buscar algo que no hay.
  const a3 = mensajeDelArea(3);
  comprobar('un area sin rasgos no recibe ninguna nota de reparto',
    !a3.includes('LO SUYO QUE TE TOCA CONTAR'), 'area 3, que no tenia ninguno');

  // ── 4. LA CACHE NO SE ROMPE ───────────────────────────────────
  // Los rasgos cambian en cada area. Si viajaran en el prompt de sistema, las
  // siete pedirian un prompt distinto y ninguna encontraria la cache: eso son
  // 22.000 tokens pagados siete veces.
  const sistemas = new Set(deArea().map(l => l.sistema));
  comprobar('el prompt de sistema sigue siendo IDENTICO en las 7 areas',
    sistemas.size === 1, sistemas.size + ' prompts distintos de 7');
  comprobar('y los rasgos NO van dentro de el',
    !deArea()[0].sistema.includes('Leal hasta el agotamiento'));
  const arranque = llamadas.find(l => l.tipo === 'cache');
  comprobar('el arranque de la cache manda el mismo prompt que las areas',
    Boolean(arranque) && arranque.sistema === deArea()[0].sistema);

  // ── 5. SI EL REPARTO SE CAE, EL INFORME SALE IGUAL ────────────
  // Es una mejora del contenido, no una pieza sin la que el estudio no exista.
  repartoFalla = 500;
  const r2 = await generar();
  comprobar('con el reparto caido, el informe se entrega igual', r2.code === 200, 'HTTP ' + r2.code);
  comprobar('y salen las 7 areas', areasDistintas() === 7, areasDistintas() + ' areas distintas');
  comprobar('ninguna area recibe nota de reparto',
    deArea().every(l => !l.mensaje.includes('LO SUYO QUE TE TOCA CONTAR')));
  repartoFalla = null;

  // ── 6. NO SE CUELA UN RASGO CON PALABRAS DE ASTROLOGO ─────────
  repartoQueDevuelve = [
    { nombre: 'Saturno te pesa encima', descripcion: 'Tu Saturno en la casa cuatro te hizo crecer deprisa.', area: 2 },
    { nombre: 'Aguantas mas de la cuenta', descripcion: 'Sostienes situaciones mucho despues de que hayan dejado de sostenerte a ti.', area: 2 },
  ];
  await generar();
  const a2 = mensajeDelArea(2);
  comprobar('el rasgo que nombra un planeta se cae',
    !a2.includes('Saturno te pesa encima'));
  comprobar('y el bueno de la misma area sigue llegando',
    a2.includes('Aguantas mas de la cuenta'));

  // ── 7. NINGUN AREA RECIBE MAS DE TRES ─────────────────────────
  // El area tiene un tope de palabras: con seis rasgos salen a 140 palabras
  // cada uno, que es el resumen que esto viene a evitar.
  repartoQueDevuelve = [
    { nombre: 'Primero de todo', descripcion: 'Una cosa concreta suya contada en una sola frase entera.', area: 4 },
    { nombre: 'Segundo distinto', descripcion: 'Otra cosa distinta suya, sin nada que ver con la anterior ni con ninguna.', area: 4 },
    { nombre: 'Tercero aparte', descripcion: 'Una tercera bien diferente, que no toca nada de lo dicho arriba.', area: 4 },
    { nombre: 'Cuarto sobrante', descripcion: 'Este ya sobra porque el area no da para tantos desarrollos largos.', area: 4 },
    { nombre: 'Quinto sobrante', descripcion: 'Y este todavia mas, que ya seria un listado en vez de un area.', area: 4 },
  ];
  await generar();
  const a4 = mensajeDelArea(4);
  // Solo las lineas de la nota del reparto: el prompt del area trae sus
  // propias viñetas y contarlas todas no mide nada.
  const nota = a4.slice(a4.indexOf('LO SUYO QUE TE TOCA CONTAR'));
  const cuantos = (nota.slice(0, nota.indexOf('\n\n')).match(/^- /gm) || []).length;
  comprobar('al area le llegan como mucho 3 rasgos', cuantos === 3, cuantos + ' rasgos');
  comprobar('y son los tres primeros',
    a4.includes('Primero de todo') && a4.includes('Tercero aparte') && !a4.includes('Cuarto sobrante'));

  // ── 8. NI UNO REPETIDO ENTRE AREAS ────────────────────────────
  // Es justo el fallo que esto viene a arreglar: Miedos y Herida contando lo
  // mismo con otras palabras.
  repartoQueDevuelve = [
    { nombre: 'Depender es quedar expuesta', descripcion: 'Crees que apoyarte en alguien te deja expuesta y sin defensa ninguna.', area: 3 },
    { nombre: 'Depender te deja expuesta', descripcion: 'Crees que apoyarte en alguien te deja expuesta y sin defensa alguna.', area: 4 },
  ];
  await generar();
  const tieneA3 = mensajeDelArea(3).includes('Depender es quedar expuesta');
  const tieneA4 = mensajeDelArea(4).includes('Depender te deja expuesta');
  comprobar('dos areas NO reciben el mismo rasgo con otras palabras',
    !(tieneA3 && tieneA4), tieneA3 && tieneA4 ? 'las dos lo tienen' : 'solo una lo tiene');

  // ── 9. EL PROMPT Y LA NOTA SE MONTAN ENTEROS ──────────────────
  //
  // Un ${...} sin sustituir no rompe nada: se manda al modelo tal cual, y
  // lo que lee es basura en vez de la regla. No se ve en ningun sitio hasta
  // que sale un estudio raro, asi que se mira aqui.
  repartoQueDevuelve = [
    { nombre: 'Leal hasta el agotamiento', descripcion: 'Te quedas sosteniendo mucho despues de que deje de tener sentido quedarte.', area: 1 },
    { nombre: 'Cuentas lo que das', descripcion: 'Llevas sin querer la cuenta de lo que pones y de lo que te devuelven a ti.', area: 1 },
  ];
  await generar();
  const elReparto = llamadas.find(l => l.tipo === 'reparto');
  const sueltos = (elReparto.sistema.match(/\$\{[^}]*\}/g) || []);
  comprobar('el prompt del reparto no lleva ningun ${...} sin sustituir',
    sueltos.length === 0, sueltos.slice(0, 3).join(' '));
  comprobar('y lleva la carta de la persona dentro', elReparto.sistema.includes(CARTA.split('\n')[1]));

  // El numero que se le pide. Tres es el objetivo en las siete y dos el
  // suelo: si esto se afloja a "al menos uno", volvemos al estudio de tres
  // ideas que esto viene a arreglar, y no se notaria hasta leer un PDF.
  comprobar('pide 3 por area como objetivo, no como techo',
    /3 POR ÁREA\. Ese es el número/.test(elReparto.sistema));
  comprobar('y pone el suelo en 2, solo si el tercero seria inventado',
    /SOLO BAJAS A 2 SI EL TERCERO SERÍA INVENTADO/.test(elReparto.sistema)
    && /por debajo de 2 no baja ninguna área/.test(elReparto.sistema));

  const conNota = mensajeDelArea(1);
  const laNota = conNota.slice(conNota.indexOf('LO SUYO QUE TE TOCA'));
  comprobar('la nota del area tampoco lleva ${...} sueltos',
    !/\$\{/.test(laNota));
  comprobar('la nota va antes del recordatorio final, no detras',
    conNota.indexOf('LO SUYO QUE TE TOCA') < conNota.indexOf('ANTES DE DAR EL AREA POR TERMINADA'));

  // Lo que mas facil se rompe al tocar la nota: que contradiga al prompt del
  // area, que le dice desde siempre que puede cruzar toda la carta para
  // explicar lo suyo. Si la nota dijera "no mires otra cosa", se pelearian.
  comprobar('la nota NO contradice al prompt del area (le deja cruzar la carta)',
    laNota.includes('sigues cruzando todo lo que haga falta'));
  comprobar('y NO le cambia el trabajo a los bloques',
    laNota.includes('Los bloques no cambian de trabajo'));

} catch (err) {
  console.error('\n  ✘ la prueba reventó:', err.message);
  console.error(err.stack);
  fallos++;
} finally {
  limpiar();
}

console.log(fallos ? `\n  ${fallos} COMPROBACIONES FALLIDAS\n` : '\n  todo pasa\n');
process.exit(fallos ? 1 : 0);
