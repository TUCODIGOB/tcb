// ═════════════════════════════════════════════════════════════════
// test/rasgos-en-areas.test.mjs
//
// Vigila que LAS LISTAS SEAN LA FUENTE DEL ESTUDIO.
//
// Como funciona: se lee la carta UNA vez y salen las dos listas de rasgos,
// cada rasgo con su area. Despues cada una de las siete areas se escribe con
// LOS SUYOS y con ninguno mas. Asi lo que la clienta lee en el area y lo que
// lee en la lista del final es lo mismo, y un rasgo no puede salir contado en
// dos areas distintas.
//
// POR QUE IMPORTA: antes cada area leia la carta entera por su cuenta, las
// siete encontraban el tema mas fuerte de la persona y las siete escribian
// sobre el. En el estudio del 25 de agosto las siete areas se reducian a tres
// ideas. La clienta lo nota: siente que todo le habla de lo mismo.
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

// La tienda de sesiones: update() tiene que guardar de verdad, porque el
// codigo reserva la sesion escribiendo en ella antes de gastar.
const TIENDA = new Map();
globalThis.__TIENDA_RASGOS_AREAS = TIENDA;
escribir('.stripe-falso-ra.mjs', `
const T = globalThis.__TIENDA_RASGOS_AREAS;
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

const copiaChat = escribir('.chat-ra.mjs',
  fs.readFileSync(path.join(RAIZ, 'api/chat.js'), 'utf8')
    .replace("import Stripe from 'stripe';", "import Stripe from './.stripe-falso-ra.mjs';"));

process.env.STRIPE_SECRET_KEY = 'sk_test';
process.env.ANTHROPIC_API_KEY = 'k';
process.env.BREVO_API_KEY = '';

let fallos = 0;
const comprobar = (desc, ok, detalle = '') => {
  console.log(`  ${ok ? '✔' : '✘ FALLA'}  ${desc}${detalle ? '  [' + detalle + ']' : ''}`);
  if (!ok) fallos++;
};

const CARTA = `Carta natal calculada:
- Ascendente: 6.4 de Libra
- Sol: 21.4 de Piscis
- Luna: 13.5 de Capricornio`;

// ── Una lista completa: 2 rasgos en cada una de las siete areas, que es
//    justo el minimo que el codigo exige. Repartidos entre las dos listas.
const rasgo = (n, d, area) => ({ nombre: n, descripcion: d, area });
const LISTA_BUENA = {
  fortalezas: [
    rasgo('Detectas lo que hace falta', 'Ves lo que le falta a otra persona antes de que lo diga y te pones a ello.', 1),
    rasgo('Cabeza clara bajo presión', 'Cuando todo se complica eres tú la que analiza con calma mientras los demás se aturullan.', 1),
    rasgo('Constancia que no se nota', 'Sostienes esfuerzos largos sin necesitar que nadie te aplauda por el camino.', 2),
    rasgo('Rigor que da confianza', 'Cuando dices que algo está hecho, la gente sabe que puede darlo por bueno.', 2),
    rasgo('Olfato para el peligro', 'Hueles lo que puede torcerse mucho antes de que se tuerza de verdad.', 3),
    rasgo('Ternura que no se ve', 'Cuidas de una manera que no se anuncia y que solo nota quien está muy cerca.', 4),
    rasgo('Quieres con hechos', 'Demuestras el cariño haciendo cosas, no diciéndolas, y eso se sostiene en el tiempo.', 5),
    rasgo('La gente se te acerca', 'Acabas siendo aquella a la que todo el mundo cuenta lo que no cuenta a nadie.', 6),
    rasgo('Cabeza fría con el dinero', 'No tomas decisiones de dinero a lo loco, miras despacio y calculas.', 7),
    rasgo('Sabes multiplicar lo que hay', 'Haces rendir lo que ya existe sin necesidad de empezar nada de cero.', 7),
    rasgo('Aguantas de pie mucho rato', 'Sostienes situaciones largas sin que se te note por fuera lo que pesan.', 3),
    rasgo('Sabes estar sin invadir', 'Acompañas sin ocupar el sitio de nadie, y eso descansa a quien está al lado.', 6),
  ],
  desafios: [
    rasgo('Exigencia que no se apaga', 'Te pides a ti misma un nivel que jamás le pedirías a otra persona.', 1),
    rasgo('Te cuesta soltar el control', 'Revisas lo que ya estaba bien porque parar te deja una sensación rara.', 2),
    rasgo('Miedo a dejar de hacer falta', 'Crees que si dejas de ser la que resuelve, dejarás de tener sitio.', 3),
    rasgo('Vives alerta sin necesidad', 'Sigues vigilando mucho después de que el peligro se haya ido del todo.', 3),
    rasgo('Guardarte lo que duele', 'Te callas lo que te pasa para no añadir tu peso al de los demás.', 4),
    rasgo('Culpa por ponerte primero', 'Atender lo tuyo antes que lo de otro te deja mal cuerpo durante días.', 4),
    rasgo('Miedo a no merecer cariño', 'No te crees del todo el afecto que llega sin que hayas hecho algo por el.', 5),
    rasgo('Idealizas lo que no tienes', 'Lo que está lejos se te agranda y lo que tienes cerca se te encoge.', 5),
    rasgo('Aguantas más de la cuenta', 'Sostienes situaciones mucho después de que hayan dejado de sostenerte a ti.', 6),
    rasgo('Te cuesta pedir', 'Pedir ayuda te pone en un sitio incómodo y prefieres apañártelas sola.', 6),
    rasgo('Te comparas con lo que no tienes', 'Miras lo que a otros les sobra en vez de lo que a ti ya te sostiene.', 7),
    rasgo('Te cuesta cobrar lo tuyo', 'Poner precio a lo que sale de ti te suena casi a traicion y acabas rebajando.', 7),
  ],
};

let listaQueDevuelve = null;
let listaFalla = null;
let loQueElAreaCopia = null;
const llamadas = [];

function quePide(cuerpo) {
  const props = cuerpo.output_config?.format?.schema?.properties || {};
  if (cuerpo.max_tokens === 16) return 'cache';
  if (props.fortalezas || props.desafios) return 'lista';
  if (props.bloques) return 'area';
  return 'otra';
}

// Un area que pasa todos los controles de calidad de chat.js.
function porBloques(parrafos) {
  const nombres = ['arranque', 'hoy', 'origen', 'creencias', 'soltar'];
  const bloques = {};
  for (const n of nombres) bloques[n] = [];
  parrafos.forEach((x, i) => bloques[nombres[Math.min(i, nombres.length - 1)]].push(x));
  return { bloques };
}
const areaEscrita = (loCopiado) => JSON.stringify({
  ...porBloques([
    { ladillo: null, texto: (loCopiado ? loCopiado + ' ' : '') + 'Antes de contarte nada de ti, quiero que pienses en las personas que sostienen, porque en cualquier familia hay una.' },
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
  const sistema = String(Array.isArray(cuerpo.system)
    ? (cuerpo.system[0] || {}).text || ''
    : cuerpo.system || '');
  llamadas.push({ tipo, sistema, mensaje: String(cuerpo.messages?.[0]?.content || ''), esquema: cuerpo.output_config?.format?.schema || null });

  if (tipo === 'lista') {
    if (listaFalla) return { ok: false, status: listaFalla, text: async () => 'error de prueba' };
    return { ok: true, status: 200, json: async () => ({
      content: [{ type: 'text', text: JSON.stringify(listaQueDevuelve || LISTA_BUENA) }],
      stop_reason: 'end_turn', usage: {},
    }) };
  }
  return { ok: true, status: 200, json: async () => ({
    content: [{ type: 'text', text: tipo === 'area' ? areaEscrita(loQueElAreaCopia) : '{}' }],
    stop_reason: 'end_turn', usage: {},
  }) };
};

const { default: chat } = await import(copiaChat);

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
  const sid = 'cs_test_ra_' + (++nSesion);
  TIENDA.set(sid, {
    id: sid, payment_status: 'paid', customer_email: 'p@e.com',
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
const mensajeDelArea = n => {
  const suyas = deArea().filter(l => new RegExp(`ÁREA ${n} —`).test(l.mensaje));
  return suyas.length ? suyas[suyas.length - 1].mensaje : '';
};
const areasDistintas = () => new Set(deArea()
  .map(l => (l.mensaje.match(/ÁREA (\d) —/) || [])[1]).filter(Boolean)).size;
const notaDe = n => {
  const m = mensajeDelArea(n);
  const i = m.indexOf('LO QUE TE TOCA CONTAR A TI');
  return i < 0 ? '' : m.slice(i, m.indexOf('ANTES DE DAR EL AREA POR TERMINADA'));
};

try {
  console.log('\n  api/chat.js — las listas mandan, y cada area cuenta lo suyo\n');

  // ── 1. LAS LISTAS SALEN ANTES QUE LAS AREAS ───────────────────
  // Si salieran a la vez, las areas no tendrian sus rasgos al empezar a
  // escribir y todo esto no serviria de nada.
  const r1 = await generar();
  comprobar('el informe se genera', r1.code === 200, 'HTTP ' + r1.code);
  const iLista = llamadas.findIndex(l => l.tipo === 'lista');
  const iArea = llamadas.findIndex(l => l.tipo === 'area');
  comprobar('las listas se piden ANTES que la primera area',
    iLista >= 0 && iArea > iLista, `lista en la ${iLista}, primera area en la ${iArea}`);
  comprobar('salen las 7 areas', areasDistintas() === 7, areasDistintas() + ' areas distintas');

  // ── 2. LOS RASGOS SE PIDEN UNA SOLA VEZ ───────────────────────
  //
  // Habia una segunda llamada, la del porque de cada ficha, que corria a la
  // vez que las areas. El porque se ha quitado -ya se cuenta entero en su
  // area- y con el esa llamada.
  //
  // Que no vuelva no se mira por el texto del encargo, que cualquiera puede
  // escribir de otra manera, sino por el esquema: un informe limpio pide DOS
  // formas distintas y nada mas. La de la lista (fortalezas+desafios) y la de
  // un area (sus seis casillas, que es tambien la que calienta la cache). Una
  // llamada nueva al modelo trae una tercera forma y aqui se ve.
  //
  // Eran tres hasta el 26 de agosto: habia una cuarta llamada por area, la
  // del corrector que leia, con un esquema de "frases". Se quito, y por eso
  // aqui bajan de tres a dos.
  const tipos = llamadas.map(l => l.tipo);
  comprobar('la lista se pide una sola vez',
    tipos.filter(t => t === 'lista').length === 1,
    tipos.filter(t => t === 'lista').length + ' llamada(s)');
  const formas = [...new Set(llamadas
    .map(l => Object.keys(l.esquema?.properties || {}).sort().join('+')))].sort();
  comprobar('y en todo el informe solo se piden esas dos formas',
    formas.length === 2
    && formas.includes('desafios+fortalezas')
    && formas.some(f => f.startsWith('bloques+')),
    formas.join(' / '));

  // Y la ficha que sale por la puerta son sus tres casillas y ninguna mas.
  const ficha1 = r1.body?.rasgos?.fortalezas?.[0];
  comprobar('cada ficha llega con nombre, frase y area, y con nada mas',
    Boolean(ficha1) && JSON.stringify(Object.keys(ficha1).sort())
      === JSON.stringify(['area', 'descripcion', 'nombre']),
    ficha1 ? Object.keys(ficha1).join(', ') : 'sin fichas');

  // ── 3. CADA AREA RECIBE LOS SUYOS Y SOLO LOS SUYOS ────────────
  const n1 = notaDe(1), n7 = notaDe(7);
  comprobar('el area 1 recibe sus dos fortalezas y su desafio',
    n1.includes('Detectas lo que hace falta') && n1.includes('Cabeza clara bajo presión')
    && n1.includes('Exigencia que no se apaga'));
  comprobar('y NO recibe ni uno de otra area',
    !n1.includes('Cabeza fría con el dinero') && !n1.includes('Te cuesta pedir')
    && !n1.includes('Guardarte lo que duele'));
  comprobar('el area 7 recibe los suyos', n7.includes('Cabeza fría con el dinero')
    && n7.includes('Sabes multiplicar lo que hay') && n7.includes('Te comparas con lo que no tienes'));
  comprobar('y ninguno del area 1', !n7.includes('Detectas lo que hace falta'));

  // Ningun rasgo puede estar en dos areas a la vez: es la razon de ser de esto.
  const todos = [...LISTA_BUENA.fortalezas, ...LISTA_BUENA.desafios];
  const enVariasAreas = todos.filter(r => {
    let veces = 0;
    for (let a = 1; a <= 7; a++) if (notaDe(a).includes(r.nombre)) veces++;
    return veces > 1;
  });
  comprobar('ni un solo rasgo llega a dos areas distintas',
    enVariasAreas.length === 0,
    enVariasAreas.length ? enVariasAreas.map(r => r.nombre).join(', ') : 'los 21 en un area cada uno');

  // Y llegan TODOS: si la lista le da tres a un area, el area cuenta tres.
  const sinRepartir = todos.filter(r => !notaDe(r.area).includes(r.nombre));
  comprobar('y todos los de la lista llegan a su area',
    sinRepartir.length === 0,
    sinRepartir.length ? sinRepartir.map(r => r.nombre).join(', ') : `los ${todos.length} repartidos`);

  // ── 4. SI LAS LISTAS SE CAEN, EL INFORME SALE IGUAL ───────────
  listaFalla = 500;
  const r2 = await generar();
  listaFalla = null;
  comprobar('con las listas caidas el informe se entrega igual', r2.code === 200, 'HTTP ' + r2.code);
  comprobar('y salen las 7 areas', areasDistintas() === 7, areasDistintas() + ' areas distintas');
  comprobar('ninguna area recibe nota de rasgos',
    deArea().every(l => !l.mensaje.includes('LO QUE TE TOCA CONTAR A TI')));

  // ── 5. NINGUN AREA POR DEBAJO DE DOS ──────────────────────────
  // Un area con un solo rasgo son cuatro paginas dando vueltas a una cosa.
  // Cuando pasa, la lista se vuelve a pedir: no es un aviso, es un repaso.
  listaQueDevuelve = {
    fortalezas: LISTA_BUENA.fortalezas.filter(r => r.area !== 3),
    desafios: LISTA_BUENA.desafios.filter(r => r.area !== 3)
      .concat([rasgo('Vives alerta sin necesidad', 'Sigues vigilando mucho después de que el peligro se haya ido del todo.', 3)]),
  };
  await generar();
  const vecesQueSePide = llamadas.filter(l => l.tipo === 'lista').length;
  comprobar('una lista que deja un area con 1 rasgo se vuelve a pedir',
    vecesQueSePide > 1, vecesQueSePide + ' veces');
  const encargo = llamadas.filter(l => l.tipo === 'lista')[1]?.mensaje || '';
  comprobar('y se le dice que area se ha quedado corta',
    /MIEDOS \(1\)/.test(encargo), encargo.slice(0, 90).replace(/\n/g, ' '));
  listaQueDevuelve = null;

  // ── 6. LA CACHE NO SE ROMPE ───────────────────────────────────
  await generar();
  const sistemas = new Set(deArea().map(l => l.sistema));
  comprobar('el prompt de sistema sigue siendo IDENTICO en las 7 areas',
    sistemas.size === 1, sistemas.size + ' prompts distintos de 7');
  comprobar('y los rasgos NO van dentro de el',
    !deArea()[0].sistema.includes('Detectas lo que hace falta'));
  const arranque = llamadas.find(l => l.tipo === 'cache');
  comprobar('el arranque de la cache manda el mismo prompt que las areas',
    Boolean(arranque) && arranque.sistema === deArea()[0].sistema);

  // ── 7. LOS PROMPTS SE MONTAN ENTEROS ──────────────────────────
  // Un ${...} sin sustituir se manda al modelo tal cual y no se ve en ningun
  // sitio hasta que sale un estudio raro.
  const laLista = llamadas.find(l => l.tipo === 'lista');
  {
    const sueltos = laLista.sistema.match(/\$\{[^}]*\}/g) || [];
    comprobar('el prompt de la lista no lleva ningun \${...} sin sustituir',
      sueltos.length === 0, sueltos.slice(0, 3).join(' '));
  }
  comprobar('la lista pide el minimo por area', /al menos 2/.test(laLista.sistema));

  // ── LA CARTA DA EL MECANISMO, NO LA BIOGRAFIA ─────────────────
  //
  // En el informe 22, 24 de las 30 fichas afirmaban una infancia que nadie
  // sabe: "En tu casa aprendiste que lo de dentro no se ensena", "Creciste
  // viendo que el carino se demostraba haciendo". La clienta lee algo que no le
  // paso y deja de creerse el estudio entero.
  //
  // Salia del propio prompt, que pedia "lo que aprendio de pequena" y ponia de
  // EJEMPLO BUENO dos frases de infancia. Una de ellas, "En tu casa aprendiste
  // que lo de dentro no se ensena", aparecio calcada palabra por palabra.
  const FABRICA_INFANCIA = /(creciste|de peque|de niñ|en tu casa|desde joven)/i;
  {
    const buenos = (laLista.sistema.match(/BIEN: "[^"]+"/g) || []);
    const inventan = buenos.filter(x => FABRICA_INFANCIA.test(x));
    comprobar('ningun ejemplo BUENO de la lista afirma una infancia',
      inventan.length === 0, inventan.join(' | ').slice(0, 120));
  }
  comprobar('la nota del area no lleva \${...} sueltos', !/\$\{/.test(notaDe(1)));
  // Y lo mismo en las dos piezas que van a las areas, que es donde vive HOY
  // y donde vive el repaso final: un hueco sin sustituir se manda tal cual.
  for (const [que, texto] of [
    ['el prompt de sistema del area', deArea()[0].sistema],
    ['el mensaje del area', mensajeDelArea(1)],
  ]) {
    const sueltos = texto.match(/\$\{[^}]*\}/g) || [];
    comprobar(`${que} no lleva ningun \${...} sin sustituir`,
      sueltos.length === 0, sueltos.slice(0, 3).join(' '));
  }
  comprobar('la nota le dice que no anada ninguno mas',
    notaDe(1).includes('NO ANADES NINGUNO MAS'));

  // ── 7b. LOS RASGOS NO SE COMEN LOS PUNTOS DE HOY ──────────────
  //
  // El area tiene 900 palabras contadas y HOY le pide tres o cuatro cosas
  // concretas segun cual sea: en el area 5 son como es en el amor, que tipo
  // de persona atrae, que necesita para sentirse querida y donde se tuerce
  // siempre. Eso es lo que la clienta ha venido a leer.
  //
  // Al repartir los rasgos, la nota llegaba al final del mensaje pidiendo N
  // temas "cada uno contado a fondo", y encima se titulaba Y NADA MAS. Eran
  // dos indices peleandose por el mismo hueco, y ganaba el ultimo que se lee.
  // En el estudio 21 se vio: "que tipo de persona atraes" quedo en dos frases
  // sueltas sin ladillo, y en el 20 tenia dos parrafos propios.
  //
  // El arreglo no quita rasgos ni alarga el area: dice que los rasgos van POR
  // DENTRO de esos puntos, porque describen lo mismo. Aqui se comprueba que
  // eso llega dicho, que la nota ya no autoriza a saltarselos, y que el
  // repaso final los cuenta, que era el unico sitio donde no se miraban.
  const nota1 = notaDe(1);
  comprobar('la nota manda empezar por los puntos, no por la lista',
    /EMPIEZA POR LOS PUNTOS, NO POR LA LISTA/.test(nota1));
  comprobar('y dice que los rasgos van POR DENTRO de esos puntos',
    /NO SON UN INDICE APARTE/.test(nota1) && /POR DENTRO/.test(nota1));
  comprobar('y su titulo ya no dice "y nada mas", que era el permiso para saltarselos',
    /NINGUN RASGO MAS/.test(nota1) && !/EN ESTA AREA, Y NADA MAS/.test(nota1));
  comprobar('y ya no pide cada rasgo "contado a fondo" como si fuera un tema suelto',
    !/Van los \d+, cada uno contado a fondo/.test(nota1));
  comprobar('y ninguno se cae por no encajar en un punto de HOY',
    /no cae en ninguno de esos puntos, va igual/.test(nota1));

  const sist = deArea()[0].sistema;
  comprobar('HOY dice que sus puntos van todos y ninguno en media linea',
    /VAN TODAS, Y NINGUNA EN MEDIA LÍNEA/.test(sist));
  comprobar('y que los rasgos los llenan, no se suman a ellos',
    /NO SE SUMAN A ESTOS PUNTOS, LOS LLENAN/.test(sist));
  comprobar('y no deja recortar la escena ni el cierre para hacerles sitio',
    /nunca se recorta para que quepan es lo que va en su propia casilla, que es la escena, los dos remates, la pregunta y el cierre/.test(sist));

  // El repaso final viaja en el mensaje, no en el prompt de sistema.
  const msg1 = mensajeDelArea(1);
  comprobar('el repaso final cuenta los puntos de HOY antes de entregar',
    /ESTAN LAS TRES O CUATRO COSAS QUE HOY LE PIDE A TU AREA/.test(msg1));
  comprobar('y la lista de repaso ya no promete un numero que no cumple',
    /REPASA ESTAS, QUE SON LAS QUE MAS SE ESCAPAN/.test(msg1));

  // Lo de antes no se ha caido por el camino.
  comprobar('los rasgos siguen sin poder quedarse en un solo bloque',
    /Los bloques no cambian de trabajo/.test(nota1));
  comprobar('y siguen sin copiarse tal cual en el texto',
    /NO SE COPIAN/.test(nota1));

  // ── 8. NADA INTERNO SE IMPRIME ────────────────────────────────
  // Si el modelo copiara dentro del texto una de las cabeceras que le
  // hablan a el, la clienta leeria las instrucciones internas del producto
  // en un estudio de 27 euros. Se prueban las dos que van en el mensaje de
  // cada area: la de los rasgos que le tocan y la de la forma que lleva.
  for (const [cabecera, comoSeLlama] of [
    ['LO QUE TE TOCA CONTAR A TI EN ESTA AREA:', 'la nota de los rasgos'],
    ['POR DÓNDE VA ESTA ÁREA:', 'la nota de la forma'],
  ]) {
    loQueElAreaCopia = cabecera;
    const rFuga = await generar();
    loQueElAreaCopia = null;
    const intentos1 = deArea().filter(l => /ÁREA 1 —/.test(l.mensaje)).length;
    comprobar(`un area que copia ${comoSeLlama} se manda a rehacer`,
      intentos1 > 1, intentos1 + ' intentos');
    comprobar(`y el estudio no se entrega con ${comoSeLlama} dentro`,
      !String(rFuga.body?.texto || '').includes(cabecera));
  }

  // ── 9. EL PROMPT NO SE CONTRADICE ────────────────────────────
  //
  // Las listas pasaron de ser el apendice del final a ser la base del estudio.
  // Su prompt seguia diciendo que "cierran el estudio", que se leen "despues
  // de las siete areas" y que recogen lo que "en las areas no ha dado tiempo a
  // nombrar": justo lo contrario de lo que ahora hacen. Eso no revienta nada,
  // solo hace que el modelo se las tome como un sobrante y las escriba peor,
  // y no se ve hasta leer un estudio entero.
  await generar();
  const pLista = llamadas.find(l => l.tipo === 'lista').sistema;
  comprobar('el prompt de la lista dice que es la BASE del estudio',
    /ESTAS LISTAS SON LA BASE DEL ESTUDIO ENTERO/.test(pLista));
  comprobar('y no dice ya que sea lo que cierra el estudio',
    !/cierras el estudio/i.test(pLista) && !/se leen despues de las siete areas/i.test(pLista));
  comprobar('ni que recoja lo que a las areas no les dio tiempo',
    !/no ha dado tiempo a nombrar/i.test(pLista));
  // Y la casilla del porque no esta ni en el prompt ni en el esquema: si
  // volviera por cualquiera de los dos, la ficha dejaria de ser tres cosas.
  const casillasDeLaFicha = Object.keys(
    llamadas.find(l => l.tipo === 'lista').esquema?.properties?.fortalezas?.items?.properties || {}
  ).sort();
  comprobar('ni pide el porque de cada ficha, que ya no existe',
    !/"explicacion"/.test(pLista)
    && JSON.stringify(casillasDeLaFicha) === JSON.stringify(['area', 'descripcion', 'nombre']),
    casillasDeLaFicha.join(', '));

  // El area recibe dos repartos: el de la carta (que mira) y el de los rasgos
  // (que cuenta). Si chocan y no se dice cual manda, el area se queda sin
  // contar un rasgo suyo por creer que es de otra.
  comprobar('la nota deja claro que ante la duda manda la lista',
    notaDe(1).includes('MANDA ESTA LISTA'));

  // ── 10. CADA AREA ABRE, ENTRA Y CIERRA POR SU SITIO ───────────
  //
  // Las siete las escriben siete llamadas que no se ven entre ellas y todas
  // leen el mismo prompt, asi que si la forma la elige el modelo, las siete
  // eligen la misma. Paso en los dos ultimos estudios: las 12
  // areas abrieron igual, las 14 escenas empezaron con la hora y los 14
  // cierres calcaron el ejemplo del prompt.
  //
  // Por eso cada area lleva escrita SU forma. Aqui se comprueba que le llega,
  // que no hay dos areas con la misma, y que sigue prohibido lo que salia solo.
  await generar();
  const moldes = [];
  for (let n = 1; n <= 7; n++) {
    const m = mensajeDelArea(n);
    const i = m.indexOf('POR DÓNDE VA ESTA ÁREA');
    comprobar(`el area ${n} recibe su forma`, i >= 0);
    if (i < 0) continue;
    const fin = m.indexOf('LO QUE TE TOCA CONTAR A TI', i);
    moldes.push(m.slice(i, fin > i ? fin : m.length));
  }
  comprobar('y las siete formas son distintas entre si',
    new Set(moldes).size === 7, new Set(moldes).size + ' distintas de 7');

  const abre = moldes.map(t => (t.match(/- ABRE ([^\n]+)/) || [])[1]);
  comprobar('ninguna abre por la misma puerta que otra',
    new Set(abre).size === 7, new Set(abre).size + ' puertas distintas de 7');

  const entra = moldes.map(t => (t.match(/EL EJEMPLO ENTRA ([^\n]+)/) || [])[1]);
  comprobar('ninguna entra al ejemplo con la misma invitacion',
    new Set(entra).size === 7, new Set(entra).size + ' invitaciones de 7');

  const cuando = moldes.map(t => (t.match(/EL EJEMPLO PASA ([^\n]+)/) || [])[1]);
  comprobar('el ejemplo de cada area pasa en un momento distinto',
    new Set(cuando).size === 7, new Set(cuando).size + ' momentos de 7');
  comprobar('y no todos de noche',
    cuando.length === 7 && cuando.filter(x => /noche|madrugada/.test(String(x))).length <= 2,
    cuando.filter(x => /noche|madrugada/.test(String(x))).length + ' de noche de 7');

  comprobar('a todas se les prohibe empezar el ejemplo por la hora',
    moldes.length === 7 && moldes.every(t => t.includes('NO EMPIEZA POR LA HORA')));
  comprobar('y empezar el cierre con la formula que salia sola',
    moldes.length === 7 && moldes.every(t => t.includes('No es que...')));

  // Las siete preguntas del ultimo estudio empezaron todas por
  // "¿Cuantas veces" o "¿Cuanto hace", y dos areas acabaron con la misma
  // pregunta palabra por palabra. Misma causa que las aperturas: un solo
  // ejemplo en el prompt compartido y siete llamadas que no se ven.
  const pregunta = moldes.map(t => (t.match(/- LA PREGUNTA VA ([^\n]+)/) || [])[1]);
  comprobar('ninguna pregunta va por donde la de otra',
    new Set(pregunta).size === 7, new Set(pregunta).size + ' formas de 7');
  comprobar('y a todas se les prohiben las tres que salian solas',
    moldes.length === 7 && moldes.every(t => t.includes('"¿Cuántas veces..."')));

  const cierra = moldes.map(t => (t.match(/- CIERRA ([^\n]+)/) || [])[1]);
  comprobar('ninguna cierra de la misma forma que otra',
    new Set(cierra).size === 7, new Set(cierra).size + ' formas de 7');

  // Distintas palabra por palabra no basta: dos moldes pueden decir lo mismo
  // con una coma de diferencia y las areas salen iguales igual. Se busca el
  // trozo largo repetido, que es lo que delata al gemelo. Paso con los cierres
  // del area 1 y el area 7: los dos eran "frase corta y seca, y la puerta
  // detras". Lo comun de la plantilla no cuenta, solo la parte de cada una.
  const soloSuyo = (linea, comun) => String(linea).replace(comun, '');
  const trozos = (t, n = 5) => {
    const p = String(t).toLowerCase().split(/[^a-záéíóúñ]+/).filter(Boolean);
    return new Set(p.slice(0, Math.max(0, p.length - n + 1)).map((_, i) => p.slice(i, i + n).join(' ')));
  };
  for (const [comoSeLlama, lineas, comun] of [
    ['las puertas', abre, /\. Sigues abriendo ancho.*$/],
    ['las invitaciones', entra, /\. Esa media línea.*$/],
    ['los cierres', cierra, /\. Y NO EMPIECES EL CIERRE.*$/],
    ['las preguntas', pregunta, /\. Y NO EMPIEZA por.*$/],
  ]) {
    const suyas = lineas.map(l => soloSuyo(l, comun));
    const gemelas = [];
    for (let a = 0; a < suyas.length; a++) {
      for (let b = a + 1; b < suyas.length; b++) {
        const ta = trozos(suyas[a]);
        const repetido = [...trozos(suyas[b])].find(x => ta.has(x));
        if (repetido) gemelas.push(`${a + 1}/${b + 1}: "${repetido}"`);
      }
    }
    comprobar(`ninguna pareja de ${comoSeLlama} repite un trozo largo`,
      gemelas.length === 0, gemelas.join('  '));
  }

  // Y el prompt compartido ya no le dice que elija el la forma, que es lo que
  // hacia que las siete eligieran la misma.
  const sistema = deArea()[0].sistema;
  comprobar('el prompt compartido manda al molde, no le deja elegir',
    /NO ELIJAS TÚ POR DÓNDE/.test(sistema));
  comprobar('y avisa de que el ejemplo de cierre no se calca',
    /DE AHÍ SE COGE LO QUE HACE, NO CÓMO ESTÁ ARMADO/.test(sistema));
  comprobar('la invitacion de la escena va DENTRO de su casilla',
    /LA INVITACIÓN VA DENTRO DE SU CASILLA/.test(sistema));
  comprobar('y el prompt compartido no dicta cual es, la manda al molde',
    /AQUÍ NO PONE CUÁL/.test(sistema) && !/déjame que te enseñe un rato tuyo/.test(sistema));
  comprobar('y avisa de que los ejemplos de escena no marcan el arranque',
    /DE ESOS TRES SE COGE EL CONTENIDO, NO EL ARRANQUE/.test(sistema));
  comprobar('y que del fragmento de tono no se copia la puerta',
    /ancho SÍ, pero por dónde ya te lo dice tu área/.test(sistema));
  comprobar('y que del ejemplo de pregunta no se copia el arranque',
    /De ese ejemplo se coge la pelota que devuelve, no las palabras con las que arranca/.test(sistema));
  comprobar('el repaso final pide texto detras de cada frase grande',
    /ninguna va detras del ultimo parrafo, que ahi solo va el cierre/.test(mensajeDelArea(1)));

  // El fragmento de ASI SUENA CUANDO ESTA BIEN abre por una puerta concreta.
  // Si ademas se le diera esa misma puerta a un area, esa area podria calcarlo
  // entero sin desobedecer y las siete acabarian leyendo la misma dos veces.
  comprobar('ninguna area abre por la puerta del fragmento de tono',
    abre.every(x => !/familia hay una|todo el mundo tiene cerca/i.test(String(x))));

} catch (err) {
  console.error('\n  ✘ la prueba reventó:', err.message);
  console.error(err.stack);
  fallos++;
} finally {
  limpiar();
}

console.log(fallos ? `\n  ${fallos} COMPROBACIONES FALLIDAS\n` : '\n  todo pasa\n');
process.exit(fallos ? 1 : 0);
