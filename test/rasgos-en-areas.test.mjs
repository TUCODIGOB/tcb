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
    rasgo('Cabeza clara bajo presion', 'Cuando todo se complica eres tu la que analiza con calma mientras los demas se aturullan.', 1),
    rasgo('Constancia que no se nota', 'Sostienes esfuerzos largos sin necesitar que nadie te aplauda por el camino.', 2),
    rasgo('Rigor que da confianza', 'Cuando dices que algo esta hecho, la gente sabe que puede darlo por bueno.', 2),
    rasgo('Olfato para el peligro', 'Hueles lo que puede torcerse mucho antes de que se tuerza de verdad.', 3),
    rasgo('Ternura que no se ve', 'Cuidas de una manera que no se anuncia y que solo nota quien esta muy cerca.', 4),
    rasgo('Quieres con hechos', 'Demuestras el carino haciendo cosas, no diciendolas, y eso se sostiene en el tiempo.', 5),
    rasgo('La gente se te acerca', 'Acabas siendo aquella a la que todo el mundo cuenta lo que no cuenta a nadie.', 6),
    rasgo('Cabeza fria con el dinero', 'No tomas decisiones de dinero a lo loco, miras despacio y calculas.', 7),
    rasgo('Sabes multiplicar lo que hay', 'Haces rendir lo que ya existe sin necesidad de empezar nada de cero.', 7),
    rasgo('Aguantas de pie mucho rato', 'Sostienes situaciones largas sin que se te note por fuera lo que pesan.', 3),
    rasgo('Sabes estar sin invadir', 'Acompanas sin ocupar el sitio de nadie, y eso descansa a quien esta al lado.', 6),
  ],
  desafios: [
    rasgo('Exigencia que no se apaga', 'Te pides a ti misma un nivel que jamas le pedirias a otra persona.', 1),
    rasgo('Te cuesta soltar el control', 'Revisas lo que ya estaba bien porque parar te deja una sensacion rara.', 2),
    rasgo('Miedo a dejar de hacer falta', 'Crees que si dejas de ser la que resuelve, dejaras de tener sitio.', 3),
    rasgo('Vives alerta sin necesidad', 'Sigues vigilando mucho despues de que el peligro se haya ido del todo.', 3),
    rasgo('Guardarte lo que duele', 'Te callas lo que te pasa para no anadir tu peso al de los demas.', 4),
    rasgo('Culpa por ponerte primero', 'Atender lo tuyo antes que lo de otro te deja mal cuerpo durante dias.', 4),
    rasgo('Miedo a no merecer carino', 'No te crees del todo el afecto que llega sin que hayas hecho algo por el.', 5),
    rasgo('Idealizas lo que no tienes', 'Lo que esta lejos se te agranda y lo que tienes cerca se te encoge.', 5),
    rasgo('Aguantas mas de la cuenta', 'Sostienes situaciones mucho despues de que hayan dejado de sostenerte a ti.', 6),
    rasgo('Te cuesta pedir', 'Pedir ayuda te pone en un sitio incomodo y prefieres apanartelas sola.', 6),
    rasgo('Te comparas con lo que no tienes', 'Miras lo que a otros les sobra en vez de lo que a ti ya te sostiene.', 7),
    rasgo('Te cuesta cobrar lo tuyo', 'Poner precio a lo que sale de ti te suena casi a traicion y acabas rebajando.', 7),
  ],
};

let listaQueDevuelve = null;
let listaFalla = null;
let areaCopiaLaNota = false;
let explicacionesQueDevuelve = null;
let explicacionesFallanVeces = 0;
const llamadas = [];

function quePide(cuerpo) {
  const props = cuerpo.output_config?.format?.schema?.properties || {};
  if (cuerpo.max_tokens === 16) return 'cache';
  if (props.explicaciones) return 'explicaciones';
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
const areaEscrita = (copiandoLaNota) => JSON.stringify({
  ...porBloques([
    { ladillo: null, texto: (copiandoLaNota ? 'LO QUE TE TOCA CONTAR A TI EN ESTA AREA: ' : '') + 'Antes de contarte nada de ti, quiero que pienses en las personas que sostienen, porque en cualquier familia hay una.' },
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
  llamadas.push({ tipo, sistema, mensaje: String(cuerpo.messages?.[0]?.content || '') });

  if (tipo === 'lista') {
    if (listaFalla) return { ok: false, status: listaFalla, text: async () => 'error de prueba' };
    return { ok: true, status: 200, json: async () => ({
      content: [{ type: 'text', text: JSON.stringify(listaQueDevuelve || LISTA_BUENA) }],
      stop_reason: 'end_turn', usage: {},
    }) };
  }
  if (tipo === 'explicaciones') {
    if (explicacionesFallanVeces > 0) { explicacionesFallanVeces--; return { ok: false, status: 503, text: async () => 'error de prueba' }; }
    return { ok: true, status: 200, json: async () => ({
      content: [{ type: 'text', text: JSON.stringify({ explicaciones: explicacionesQueDevuelve || [] }) }],
      stop_reason: 'end_turn', usage: {},
    }) };
  }
  return { ok: true, status: 200, json: async () => ({
    content: [{ type: 'text', text: tipo === 'area' ? areaEscrita(areaCopiaLaNota) : '{}' }],
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

  // ── 2. LAS EXPLICACIONES NO BLOQUEAN ──────────────────────────
  // Van despues de la lista pero a la vez que las areas: si esperasen a que
  // las areas terminen, sumarian su espera entera al informe.
  const iExpl = llamadas.findIndex(l => l.tipo === 'explicaciones');
  comprobar('las explicaciones se piden despues de la lista',
    iExpl > iLista, `explicaciones en la ${iExpl}`);
  comprobar('y antes de que terminen las areas (van en paralelo)',
    iExpl < llamadas.map(l => l.tipo).lastIndexOf('area'),
    `explicaciones en la ${iExpl}, ultima area en la ${llamadas.map(l => l.tipo).lastIndexOf('area')}`);

  // ── 3. CADA AREA RECIBE LOS SUYOS Y SOLO LOS SUYOS ────────────
  const n1 = notaDe(1), n7 = notaDe(7);
  comprobar('el area 1 recibe sus dos fortalezas y su desafio',
    n1.includes('Detectas lo que hace falta') && n1.includes('Cabeza clara bajo presion')
    && n1.includes('Exigencia que no se apaga'));
  comprobar('y NO recibe ni uno de otra area',
    !n1.includes('Cabeza fria con el dinero') && !n1.includes('Te cuesta pedir')
    && !n1.includes('Guardarte lo que duele'));
  comprobar('el area 7 recibe los suyos', n7.includes('Cabeza fria con el dinero')
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
      .concat([rasgo('Vives alerta sin necesidad', 'Sigues vigilando mucho despues de que el peligro se haya ido del todo.', 3)]),
  };
  await generar();
  const vecesQueSePide = llamadas.filter(l => l.tipo === 'lista').length;
  comprobar('una lista que deja un area con 1 rasgo se vuelve a pedir',
    vecesQueSePide > 1, vecesQueSePide + ' veces');
  const encargo = llamadas.filter(l => l.tipo === 'lista')[1]?.mensaje || '';
  comprobar('y se le dice que area se ha quedado corta',
    /MIEDOS \(1\)/.test(encargo), encargo.slice(0, 90).replace(/\n/g, ' '));
  listaQueDevuelve = null;

  // ── 6. LAS EXPLICACIONES SE PEGAN A SU FICHA POR EL NUMERO ────
  explicacionesQueDevuelve = [
    { n: 1, explicacion: 'Aprendiste pronto que ser util era una manera segura de tener un sitio.' },
    { n: 3, explicacion: 'De pequena entendiste que las cosas salian con trabajo callado y no con quejas.' },
    { n: 2, explicacion: 'Te acostumbraste a poner orden con la cabeza cuando el ambiente se ponia dificil.' },
  ];
  const r3 = await generar();
  const f = r3.body?.rasgos?.fortalezas || [];
  comprobar('cada explicacion cae en la ficha de su numero',
    f[0]?.explicacion?.startsWith('Aprendiste pronto')
    && f[1]?.explicacion?.startsWith('Te acostumbraste')
    && f[2]?.explicacion?.startsWith('De pequena entendiste'),
    'se comprueba con los numeros desordenados a proposito');
  comprobar('las fichas sin explicacion se entregan igual, con su nombre',
    f.length === LISTA_BUENA.fortalezas.length && !f[3]?.explicacion && Boolean(f[3]?.nombre));

  // Una explicacion con un planeta dentro no se imprime.
  explicacionesQueDevuelve = [
    { n: 1, explicacion: 'Tu Sol enfrentado a Saturno te hizo crecer sintiendo que habia que ganarselo.' },
    { n: 2, explicacion: 'Te acostumbraste a poner orden con la cabeza cuando todo se ponia dificil.' },
  ];
  const r4 = await generar();
  const f4 = r4.body?.rasgos?.fortalezas || [];
  comprobar('una explicacion que nombra un planeta se cae', !f4[0]?.explicacion);
  comprobar('y la buena de al lado se queda', f4[1]?.explicacion?.startsWith('Te acostumbraste'));
  explicacionesQueDevuelve = null;

  // ── 7. LA CACHE NO SE ROMPE ───────────────────────────────────
  await generar();
  const sistemas = new Set(deArea().map(l => l.sistema));
  comprobar('el prompt de sistema sigue siendo IDENTICO en las 7 areas',
    sistemas.size === 1, sistemas.size + ' prompts distintos de 7');
  comprobar('y los rasgos NO van dentro de el',
    !deArea()[0].sistema.includes('Detectas lo que hace falta'));
  const arranque = llamadas.find(l => l.tipo === 'cache');
  comprobar('el arranque de la cache manda el mismo prompt que las areas',
    Boolean(arranque) && arranque.sistema === deArea()[0].sistema);

  // ── 8. LOS PROMPTS SE MONTAN ENTEROS ──────────────────────────
  // Un ${...} sin sustituir se manda al modelo tal cual y no se ve en ningun
  // sitio hasta que sale un estudio raro.
  const laLista = llamadas.find(l => l.tipo === 'lista');
  const lasExpl = llamadas.find(l => l.tipo === 'explicaciones');
  for (const [que, cual] of [['la lista', laLista], ['las explicaciones', lasExpl]]) {
    const sueltos = cual.sistema.match(/\$\{[^}]*\}/g) || [];
    comprobar(`el prompt de ${que} no lleva ningun \${...} sin sustituir`,
      sueltos.length === 0, sueltos.slice(0, 3).join(' '));
  }
  comprobar('la lista pide el minimo por area', /al menos 2/.test(laLista.sistema));
  comprobar('las explicaciones reciben los rasgos numerados',
    /1\. Detectas lo que hace falta/.test(lasExpl.sistema));
  comprobar('la nota del area no lleva \${...} sueltos', !/\$\{/.test(notaDe(1)));
  comprobar('la nota le dice que no anada ninguno mas',
    notaDe(1).includes('NO ANADES NINGUNO MAS'));

  // ── 9. NADA INTERNO SE IMPRIME ────────────────────────────────
  // Si el modelo copiara la nota dentro del texto, la clienta leeria las
  // instrucciones internas del producto en un estudio de 27 euros.
  areaCopiaLaNota = true;
  const rFuga = await generar();
  areaCopiaLaNota = false;
  const intentos1 = deArea().filter(l => /ÁREA 1 —/.test(l.mensaje)).length;
  comprobar('un area que copia la nota se manda a rehacer', intentos1 > 1, intentos1 + ' intentos');
  comprobar('y el estudio no se entrega con la instruccion dentro',
    !String(rFuga.body?.texto || '').includes('LO QUE TE TOCA CONTAR A TI'));

  // ── 10. EL PROMPT NO SE CONTRADICE ────────────────────────────
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
  comprobar('ni pide aqui la explicacion, que se pide aparte',
    !/"explicacion":/.test(pLista));

  // El area recibe dos repartos: el de la carta (que mira) y el de los rasgos
  // (que cuenta). Si chocan y no se dice cual manda, el area se queda sin
  // contar un rasgo suyo por creer que es de otra.
  comprobar('la nota deja claro que ante la duda manda la lista',
    notaDe(1).includes('MANDA ESTA LISTA'));

  // ── 11. LAS EXPLICACIONES REINTENTAN ──────────────────────────
  //
  // Corren a la vez que las siete areas, que tardan lo suyo, asi que un
  // reintento cabe sin retrasar nada. Sin el, un corte de red dejaba las
  // treinta y tantas fichas sin su linea, y eso se ve en el PDF.
  explicacionesFallanVeces = 1;
  explicacionesQueDevuelve = [{ n: 1, explicacion: 'Aprendiste pronto que ser util era una manera segura de tener un sitio.' }];
  const rReintento = await generar();
  comprobar('si las explicaciones fallan una vez, se vuelven a pedir',
    llamadas.filter(l => l.tipo === 'explicaciones').length === 2,
    llamadas.filter(l => l.tipo === 'explicaciones').length + ' llamada(s)');
  comprobar('y la explicacion acaba en su ficha',
    rReintento.body?.rasgos?.fortalezas?.[0]?.explicacion?.startsWith('Aprendiste pronto'));

  // Y si se cae del todo, las fichas salen con su nombre y su frase.
  explicacionesFallanVeces = 9;
  const rSinExpl = await generar();
  explicacionesFallanVeces = 0;
  explicacionesQueDevuelve = null;
  comprobar('si se caen del todo, el informe se entrega igual',
    rSinExpl.code === 200, 'HTTP ' + rSinExpl.code);
  const fSin = rSinExpl.body?.rasgos?.fortalezas || [];
  comprobar('y las fichas conservan nombre y frase',
    fSin.length > 0 && Boolean(fSin[0].nombre) && Boolean(fSin[0].descripcion) && !fSin[0].explicacion);

} catch (err) {
  console.error('\n  ✘ la prueba reventó:', err.message);
  console.error(err.stack);
  fallos++;
} finally {
  limpiar();
}

console.log(fallos ? `\n  ${fallos} COMPROBACIONES FALLIDAS\n` : '\n  todo pasa\n');
process.exit(fallos ? 1 : 0);
